import type { Translations } from './ja'

export const en: Translations = {
    header: {
        loc: 'LoC',
        reload: 'Reload',
        window: 'Window',
        preview: 'Preview',
        output: 'Output'
    },
    vrmModel: {
        title: '👤 VRM Model',
        replace: '🔄 Replace'
    },
    camera: {
        title: '📷 Camera Position',
        bust: 'Bust',
        full: 'Full Body',
        face: 'Face',
        save: '💾 Save',
        reset: '🔄 Reset'
    },
    lipSync: {
        title: '🎤 Lip Sync',
        on: 'ON',
        off: 'OFF'
    },
    autoExpression: {
        title: '🎭 Auto Expression',
        on: 'ON',
        off: 'OFF',
        interval: 'Interval'
    },
    background: {
        title: '🖼️ Background',
        image: 'Image',
        video: 'Video',
        greenScreen: 'GB'
    },
    animation: {
        title: '💃 Animation',
        file: '.vrma'
    },
    outputMic: {
        title: '📐 Output / 🎙️ Mic',
        noMic: 'No microphone'
    },
    colorAdjustment: {
        title: '🎨 Color Adjustment',
        brightness: 'Brightness',
        contrast: 'Contrast',
        saturation: 'Saturation',
        reset: 'Reset'
    },
    virtualCamera: {
        title: '🎥 Virtual Camera',
        start: '🎥 Start Virtual Camera',
        stop: '🎥 Stop Virtual Camera',
        connecting: 'Connecting...',
        preview: '📹 Output Check',
        previewCheck: '👁️ Preview',
        previewClose: 'Click to close',
        previewNotFound: 'Virtual camera not found'
    },
    expressions: {
        neutral: 'Neutral',
        happy: 'Happy',
        angry: 'Angry',
        sad: 'Sad',
        relaxed: 'Relaxed',
        surprised: 'Surprised'
    },
    alerts: {
        cameraSaved: (preset) => `Camera position saved for ${preset}!`,
        virtualCameraError: 'Failed to start virtual camera. Please start OBS and toggle "Start Virtual Camera" → "Stop Virtual Camera" once.',
        virtualCameraFailed: 'Failed to start virtual camera.'
    },
    tooltips: {
        hideVrm: 'Hide VRM model',
        clearBackground: 'Clear background',
        stopAnimation: 'Stop animation',
        virtualCameraHelp: 'Send video to streaming software using virtual camera'
    },
    dropZone: {
        title: 'Drop VRM File',
        description: 'or click to select',
        lastVrm: '📂 Last VRM',
        invalidFile: 'Please drop a VRM file'
    }
}
