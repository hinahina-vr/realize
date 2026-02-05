import type { Translations } from './ja'

export const zh: Translations = {
    header: {
        loc: '代码行',
        reload: '刷新',
        window: '窗口',
        preview: '预览',
        output: '输出'
    },
    vrmModel: {
        title: '👤 VRM模型',
        replace: '🔄 替换'
    },
    camera: {
        title: '📷 相机位置',
        bust: '半身',
        full: '全身',
        face: '面部',
        save: '💾 保存',
        reset: '🔄 重置'
    },
    lipSync: {
        title: '🎤 口型同步',
        on: '开',
        off: '关'
    },
    autoExpression: {
        title: '🎭 自动表情',
        on: '开',
        off: '关',
        interval: '间隔'
    },
    background: {
        title: '🖼️ 背景',
        image: '图片',
        video: '视频',
        greenScreen: '绿幕'
    },
    animation: {
        title: '💃 动画',
        file: '.vrma'
    },
    outputMic: {
        title: '📐 输出 / 🎙️ 麦克风'
    },
    colorAdjustment: {
        title: '🎨 色彩调整',
        brightness: '亮度',
        contrast: '对比度',
        saturation: '饱和度',
        reset: '重置'
    },
    virtualCamera: {
        title: '🎥 虚拟摄像头',
        start: '🎥 启动虚拟摄像头',
        stop: '🎥 停止虚拟摄像头',
        connecting: '连接中...'
    },
    expressions: {
        neutral: '正常',
        happy: '开心',
        angry: '生气',
        sad: '悲伤',
        relaxed: '放松',
        surprised: '惊讶'
    },
    alerts: {
        cameraSaved: (preset) => `已保存${preset}的相机位置！`,
        virtualCameraError: '虚拟摄像头启动失败。请先启动OBS并点击"启动虚拟摄像头"→"停止虚拟摄像头"。',
        virtualCameraFailed: '虚拟摄像头启动失败。'
    },
    dropZone: {
        title: '拖放VRM文件',
        description: '或点击选择'
    }
}
