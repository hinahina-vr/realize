// Global type augmentation for Electron API
import { ElectronAPI } from '@electron-toolkit/preload'

interface VirtualCameraAPI {
    start: (width: number, height: number, fps: number) => Promise<boolean>
    stop: () => Promise<boolean>
    sendFrame: (frameData: Uint8Array) => Promise<boolean>
    isReady: () => Promise<boolean>
}

interface DialogAPI {
    openVrm: () => Promise<string | null>
    openImage: () => Promise<string | null>
}

interface FileAPI {
    readAsBuffer: (filePath: string) => Promise<Buffer | null>
}

interface VrmaAPI {
    getPresetIds: () => Promise<string[]>
    getPreset: (presetId: string) => Promise<Uint8Array | null>
}

interface API {
    virtualCamera: VirtualCameraAPI
    dialog: DialogAPI
    file: FileAPI
    vrma: VrmaAPI
}

declare global {
    interface Window {
        electron: ElectronAPI
        api: API
    }
}

export { }
