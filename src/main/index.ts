import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import icon from '../../resources/icon.png?asset'

// グローバルなuncaughtExceptionハンドラ（write EOFエラーを無視）
process.on('uncaughtException', (err) => {
  if (err.message.includes('write EOF') || err.message.includes('EPIPE')) {
    console.log('Ignored stream error:', err.message)
    return
  }
  console.error('Uncaught exception:', err)
  // 他のエラーは再スローするか、アプリを終了
})

let virtualCameraProcess: ChildProcess | null = null
let isVirtualCameraReady = false

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

// 仮想カメラを開始
function startVirtualCamera(width: number, height: number, fps: number): Promise<boolean> {
  return new Promise((resolve) => {
    // 既存のプロセスがある場合は停止してから開始
    if (virtualCameraProcess) {
      console.log('Stopping existing virtual camera before restart')
      stopVirtualCamera()
      // 古いプロセスが終了するまで待つ
      setTimeout(() => {
        actuallyStartVirtualCamera(width, height, fps, resolve)
      }, 500)
      return
    }

    actuallyStartVirtualCamera(width, height, fps, resolve)
  })
}

// 実際に仮想カメラを開始
function actuallyStartVirtualCamera(
  width: number,
  height: number,
  fps: number,
  resolve: (value: boolean) => void
): void {
  // 開発モードではプロジェクトルートからの相対パス
  const scriptPath = is.dev
    ? join(app.getAppPath(), 'scripts/virtual_camera_bridge.py')
    : join(process.resourcesPath, 'scripts/virtual_camera_bridge.py')

  console.log('Starting virtual camera:', scriptPath)

  const proc = spawn('python', [scriptPath, width.toString(), height.toString(), fps.toString()])
  virtualCameraProcess = proc

  // stdinのエラーをキャッチ（write EOFを防ぐ - uncaughtにしない）
  proc.stdin?.on('error', (err) => {
    console.log('stdin error (expected on close):', err.message)
  })

  proc.stdout?.on('data', (data) => {
    const message = data.toString().trim()
    console.log('Virtual camera:', message)
    if (message === 'READY' && virtualCameraProcess === proc) {
      isVirtualCameraReady = true
      resolve(true)
    }
  })

  proc.stderr?.on('data', (data) => {
    console.error('Virtual camera error:', data.toString())
  })

  proc.on('close', (code) => {
    console.log('Virtual camera process exited with code:', code)
    // 現在のプロセスの場合のみリセット
    if (virtualCameraProcess === proc) {
      virtualCameraProcess = null
      isVirtualCameraReady = false
    }
  })

  proc.on('error', (err) => {
    console.error('Failed to start virtual camera:', err)
    if (virtualCameraProcess === proc) {
      virtualCameraProcess = null
      isVirtualCameraReady = false
    }
    resolve(false)
  })

  // タイムアウト
  setTimeout(() => {
    if (!isVirtualCameraReady && virtualCameraProcess === proc) {
      console.error('Virtual camera startup timeout')
      resolve(false)
    }
  }, 10000)
}

// 仮想カメラを停止
function stopVirtualCamera(): void {
  if (virtualCameraProcess) {
    const proc = virtualCameraProcess
    virtualCameraProcess = null // 先にnullにして新しいフレーム送信を防ぐ
    isVirtualCameraReady = false

    // stdinを安全に閉じる
    try {
      if (proc.stdin && !proc.stdin.destroyed) {
        proc.stdin.end()
      }
    } catch (e) {
      // エラーは無視
    }

    // 少し待ってからkill
    setTimeout(() => {
      try {
        if (!proc.killed) {
          proc.kill('SIGTERM')
        }
      } catch (e) {
        // エラーは無視
      }
    }, 200)
  }
}

// フレームを送信
let frameCounter = 0
function sendFrame(frameData: Buffer): boolean {
  if (!virtualCameraProcess || !isVirtualCameraReady) {
    return false
  }

  if (!virtualCameraProcess.stdin || virtualCameraProcess.stdin.destroyed) {
    console.error('sendFrame: stdin is not available or destroyed')
    isVirtualCameraReady = false
    return false
  }

  try {
    // エラーが発生していないか確認
    if (virtualCameraProcess.killed || virtualCameraProcess.exitCode !== null) {
      console.error('sendFrame: process has exited')
      isVirtualCameraReady = false
      return false
    }

    virtualCameraProcess.stdin.write(frameData, (err) => {
      if (err) {
        console.error('Frame write error:', err.message)
        isVirtualCameraReady = false
      }
    })
    frameCounter++
    return true
  } catch (error) {
    console.error('Failed to send frame:', error)
    isVirtualCameraReady = false
    return false
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.realize')

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
    return sendFrame(Buffer.from(frameData))
  })

  ipcMain.handle('virtual-camera:is-ready', () => {
    return isVirtualCameraReady
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopVirtualCamera()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
