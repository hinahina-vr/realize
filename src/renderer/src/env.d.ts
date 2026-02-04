/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface DialogAPI {
  openVrm: () => Promise<string | null>
  openImage: () => Promise<string | null>
}

interface FileAPI {
  readAsBuffer: (filePath: string) => Promise<Uint8Array | null>
}

interface VirtualCameraAPI {
  start: (width: number, height: number, fps: number) => Promise<boolean>
  sendFrame: (buffer: Uint8Array) => Promise<void>
  stop: () => Promise<void>
}

interface API {
  virtualCamera: VirtualCameraAPI
  dialog: DialogAPI
  file: FileAPI
}

declare global {
  interface Window {
    api: API
  }
}

export { }
