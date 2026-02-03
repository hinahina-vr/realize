import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Virtual Camera API
const virtualCameraAPI = {
  start: (width: number, height: number, fps: number): Promise<boolean> => {
    return ipcRenderer.invoke('virtual-camera:start', width, height, fps)
  },
  stop: (): Promise<boolean> => {
    return ipcRenderer.invoke('virtual-camera:stop')
  },
  sendFrame: (frameData: Uint8Array): Promise<boolean> => {
    return ipcRenderer.invoke('virtual-camera:send-frame', frameData)
  },
  isReady: (): Promise<boolean> => {
    return ipcRenderer.invoke('virtual-camera:is-ready')
  }
}

// Custom APIs for renderer
const api = {
  virtualCamera: virtualCameraAPI
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
