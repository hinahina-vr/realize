import { app, shell, BrowserWindow, ipcMain, dialog, powerSaveBlocker } from 'electron'
import { readFile as readFileAsync } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as crypto from 'crypto'
import icon from '../../resources/icon.png?asset'

// VRMA暗号化キー（encrypt-vrma.jsと同じキー）
const VRMA_ENCRYPTION_KEY = Buffer.from('R3al1z3VRM4Pr3s3tK3y2024Encrypt!', 'utf8')
const IV_LENGTH = 16

// VRMAキャッシュ
let vrmaCache: Record<string, Buffer> | null = null

// vcam-napi - ネイティブ仮想カメラモジュール
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VCam = require('vcam-napi')

// グローバルなuncaughtExceptionハンドラ
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

if (process.platform === 'win32') {
  // Keep render/update loops from being throttled when the window is occluded or in background.
  app.commandLine.appendSwitch('disable-background-timer-throttling')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
}

// 仮想カメラインスタンス
let virtualCamera: InstanceType<typeof VCam> | null = null
let isVirtualCameraReady = false
let currentWidth = 1280
let currentHeight = 720
let nv12BufferSize = 0
let powerSaveBlockerId: number | null = null

function enablePerformanceMode(): void {
  if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    return
  }
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
}

function disablePerformanceMode(): void {
  if (powerSaveBlockerId === null) {
    return
  }
  if (powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlocker.stop(powerSaveBlockerId)
  }
  powerSaveBlockerId = null
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// RGBA → NV12 変換 (BT.601 Limited Range)
// NV12: Y plane (width * height) + UV interleaved plane (width * height / 2)
// Limited Range: Y [16-235], UV [16-240]
function rgbaToNv12(rgbaData: Buffer, width: number, height: number): Buffer {
  const ySize = width * height
  const uvSize = (width * height) / 2
  const nv12Buffer = Buffer.alloc(ySize + uvSize)

  // Y plane (BT.601 Limited Range: 16 + 219 * (0.299*R + 0.587*G + 0.114*B) / 255)
  for (let i = 0; i < width * height; i++) {
    const r = rgbaData[i * 4]
    const g = rgbaData[i * 4 + 1]
    const b = rgbaData[i * 4 + 2]
    // BT.601 Limited Range Y値
    const yFloat = 0.299 * r + 0.587 * g + 0.114 * b
    const yLimited = 16 + (219 * yFloat) / 255
    nv12Buffer[i] = Math.max(16, Math.min(235, Math.round(yLimited)))
  }

  // UV plane (interleaved, 2x2 subsampling)
  // NV12: U-V interleaved, Limited Range
  let uvIndex = ySize
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      // 2x2ブロックの平均を取る
      let rSum = 0
      let gSum = 0
      let bSum = 0
      for (let dy = 0; dy < 2 && y + dy < height; dy++) {
        for (let dx = 0; dx < 2 && x + dx < width; dx++) {
          const px = ((y + dy) * width + (x + dx)) * 4
          rSum += rgbaData[px]
          gSum += rgbaData[px + 1]
          bSum += rgbaData[px + 2]
        }
      }
      const r = rSum / 4
      const g = gSum / 4
      const b = bSum / 4
      // U (Cb) Limited Range: 128 + 224 * (-0.169*R - 0.331*G + 0.5*B) / 255
      const uFloat = -0.168736 * r - 0.331264 * g + 0.5 * b
      const uLimited = 128 + (224 * uFloat) / 255
      nv12Buffer[uvIndex++] = Math.max(16, Math.min(240, Math.round(uLimited)))
      // V (Cr) Limited Range: 128 + 224 * (0.5*R - 0.419*G - 0.081*B) / 255
      const vFloat = 0.5 * r - 0.418688 * g - 0.081312 * b
      const vLimited = 128 + (224 * vFloat) / 255
      nv12Buffer[uvIndex++] = Math.max(16, Math.min(240, Math.round(vLimited)))
    }
  }

  return nv12Buffer
}

// 仮想カメラを開始
function startVirtualCamera(width: number, height: number, _fps: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // 既存のインスタンスがあれば停止
      if (virtualCamera) {
        try {
          virtualCamera.stop()
        } catch {
          // ignore
        }
        virtualCamera = null
      }

      // 新しいインスタンスを作成
      virtualCamera = new VCam()

      // NV12レイアウトを取得
      const layout = virtualCamera.get_nv12_layout(width, height)
      nv12BufferSize = layout.size
      currentWidth = width
      currentHeight = height
      frameCounter = 0

      // 仮想カメラを開始
      virtualCamera.start(width, height)
      isVirtualCameraReady = true
      enablePerformanceMode()

      console.log(`Virtual camera started: ${width}x${height}, NV12 buffer size: ${nv12BufferSize}`)
      resolve(true)
    } catch (error) {
      console.error('Failed to start virtual camera:', error)
      virtualCamera = null
      isVirtualCameraReady = false
      disablePerformanceMode()
      resolve(false)
    }
  })
}

// 仮想カメラを停止
function stopVirtualCamera(): void {
  if (virtualCamera) {
    try {
      virtualCamera.stop()
    } catch (e) {
      console.error('Error stopping virtual camera:', e)
    }
    virtualCamera = null
    isVirtualCameraReady = false
    console.log('Virtual camera stopped')
  }
  disablePerformanceMode()
}

// フレームを送信
let frameCounter = 0
function sendFrame(frameData: Buffer): boolean {
  if (!virtualCamera || !isVirtualCameraReady) {
    return false
  }

  const expectedSize = currentWidth * currentHeight * 4
  if (frameData.length !== expectedSize) {
    if (frameCounter % 30 === 0) {
      console.error(`Frame size mismatch: got ${frameData.length}, expected ${expectedSize}`)
    }
    return false
  }

  try {
    // デバッグ：最初の100フレームごとにデータをログ
    if (frameCounter % 100 === 0) {
      // 入力RGBAの最初の数ピクセルをチェック
      const samplePixels: number[] = []
      for (let i = 0; i < 20; i++) {
        samplePixels.push(frameData[i])
      }
      console.log(`Frame ${frameCounter}: Input RGBA first 20 bytes:`, samplePixels)
      console.log(`  Input size: ${frameData.length}, Expected: ${expectedSize}`)
    }

    // RGBA → NV12 変換
    const nv12Data = rgbaToNv12(frameData, currentWidth, currentHeight)

    // 仮想カメラに書き込み
    virtualCamera.write(nv12Data)
    frameCounter++
    return true
  } catch (error) {
    console.error('Failed to send frame:', error)
    return false
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.hinahina.realize-cam')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('virtual-camera:start', async (_, width: number, height: number, fps: number) => {
    return await startVirtualCamera(width, height, fps)
  })

  ipcMain.handle('virtual-camera:stop', () => {
    stopVirtualCamera()
    return true
  })

  ipcMain.handle('virtual-camera:send-frame', (_, frameData: Uint8Array) => {
    const input = Buffer.from(frameData.buffer, frameData.byteOffset, frameData.byteLength)
    return sendFrame(input)
  })

  ipcMain.handle('virtual-camera:is-ready', () => {
    return isVirtualCameraReady
  })

  // ファイルダイアログ: VRM選択
  ipcMain.handle('dialog:openVrm', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'VRM Files', extensions: ['vrm'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // ファイルダイアログ: 画像選択
  ipcMain.handle('dialog:openImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // ファイル読み込み
  ipcMain.handle('file:readAsBuffer', async (_, filePath: string) => {
    try {
      const buffer = await readFileAsync(filePath)
      return buffer
    } catch (error) {
      console.error('Failed to read file:', error)
      return null
    }
  })

  // VRMA復号化関数
  function decryptVrma(encryptedData: Buffer): Buffer {
    const iv = encryptedData.subarray(0, IV_LENGTH)
    const encrypted = encryptedData.subarray(IV_LENGTH)
    const decipher = crypto.createDecipheriv('aes-256-cbc', VRMA_ENCRYPTION_KEY, iv)
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  }

  // VRMAプリセット読み込み
  async function loadVrmaPresets(): Promise<Record<string, Buffer>> {
    if (vrmaCache) return vrmaCache

    // 開発モード: プロジェクトルート/resources
    // 本番モード: process.resourcesPath
    const encryptedPathCandidates = is.dev
      ? [join(app.getAppPath(), 'resources', 'animations.enc')]
      : [
          join(process.resourcesPath, 'animations.enc'),
          join(app.getAppPath(), 'resources', 'animations.enc'),
          join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'animations.enc'),
          join(process.resourcesPath, 'app.asar', 'resources', 'animations.enc')
        ]

    const encryptedPath = encryptedPathCandidates.find((p) => existsSync(p))
    if (!encryptedPath) {
      console.error('animations.enc not found. Checked:', encryptedPathCandidates)
      return {}
    }

    console.log('Loading VRMA presets from:', encryptedPath)
    try {
      const encryptedBundle = await readFileAsync(encryptedPath)
      const decryptedBundle = decryptVrma(encryptedBundle)
      const bundle = JSON.parse(decryptedBundle.toString('utf8'))

      vrmaCache = {}
      for (const [id, base64Data] of Object.entries(bundle.animations)) {
        const encryptedAnimation = Buffer.from(base64Data as string, 'base64')
        vrmaCache[id] = decryptVrma(encryptedAnimation)
      }
      console.log('VRMA presets loaded:', Object.keys(vrmaCache))
      return vrmaCache
    } catch (error) {
      console.error('Failed to load VRMA presets:', error)
      return {}
    }
  }

  // VRMAプリセット一覧取得
  ipcMain.handle('vrma:getPresetIds', async () => {
    const presets = await loadVrmaPresets()
    return Object.keys(presets)
  })

  // VRMAプリセット取得
  ipcMain.handle('vrma:getPreset', async (_, presetId: string) => {
    console.log('vrma:getPreset called with:', presetId)
    const presets = await loadVrmaPresets()
    const buffer = presets[presetId]
    if (!buffer) {
      console.log('Preset not found:', presetId)
      return null
    }
    console.log('Returning preset:', presetId, 'size:', buffer.length)
    // BufferをUint8Arrayに変換して送信（contextBridge経由での互換性）
    return new Uint8Array(buffer)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopVirtualCamera()
  disablePerformanceMode()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
