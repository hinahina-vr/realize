import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import icon from '../../resources/icon.png?asset'

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
      sandbox: false
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
    if (virtualCameraProcess) {
      console.log('Virtual camera already running')
      resolve(true)
      return
    }

    // 開発モードではプロジェクトルートからの相対パス
    const scriptPath = is.dev
      ? join(app.getAppPath(), 'scripts/virtual_camera_bridge.py')
      : join(process.resourcesPath, 'scripts/virtual_camera_bridge.py')

    console.log('Starting virtual camera:', scriptPath)

    virtualCameraProcess = spawn('python', [scriptPath, width.toString(), height.toString(), fps.toString()])

    virtualCameraProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim()
      console.log('Virtual camera:', message)
      if (message === 'READY') {
        isVirtualCameraReady = true
        resolve(true)
      }
    })

    virtualCameraProcess.stderr?.on('data', (data) => {
      console.error('Virtual camera error:', data.toString())
    })

    virtualCameraProcess.on('close', (code) => {
      console.log('Virtual camera process exited with code:', code)
      virtualCameraProcess = null
      isVirtualCameraReady = false
    })

    virtualCameraProcess.on('error', (err) => {
      console.error('Failed to start virtual camera:', err)
      virtualCameraProcess = null
      isVirtualCameraReady = false
      resolve(false)
    })

    // タイムアウト
    setTimeout(() => {
      if (!isVirtualCameraReady) {
        console.error('Virtual camera startup timeout')
        resolve(false)
      }
    }, 10000)
  })
}

// 仮想カメラを停止
function stopVirtualCamera(): void {
  if (virtualCameraProcess) {
    virtualCameraProcess.kill()
    virtualCameraProcess = null
    isVirtualCameraReady = false
  }
}

// フレームを送信
let frameCounter = 0
function sendFrame(frameData: Buffer): boolean {
  if (!virtualCameraProcess || !isVirtualCameraReady) {
    console.log('sendFrame: Camera not ready', { hasProcess: !!virtualCameraProcess, isReady: isVirtualCameraReady })
    return false
  }

  if (!virtualCameraProcess.stdin || virtualCameraProcess.stdin.destroyed) {
    console.error('sendFrame: stdin is not available or destroyed')
    return false
  }

  try {
    const written = virtualCameraProcess.stdin.write(frameData)
    frameCounter++
    if (frameCounter % 30 === 0) {
      console.log(`Frame sent: ${frameCounter}, buffer full: ${!written}`)
    }
    return true
  } catch (error) {
    console.error('Failed to send frame:', error)
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
