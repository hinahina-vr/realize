import { ElectronAPI } from '@electron-toolkit/preload'

interface VirtualCameraAPI {
  start: (width: number, height: number, fps: number) => Promise<boolean>
  stop: () => Promise<boolean>
  sendFrame: (frameData: Uint8Array) => Promise<boolean>
  isReady: () => Promise<boolean>
}

interface API {
  virtualCamera: VirtualCameraAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
