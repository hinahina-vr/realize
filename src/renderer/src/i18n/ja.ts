export type Language = 'ja' | 'en' | 'zh' | 'ko'

export interface Translations {
    // ヘッダー
    header: {
        loc: string
        reload: string
        window: string
        preview: string
        output: string
    }
    // VRMモデル
    vrmModel: {
        title: string
        replace: string
    }
    // カメラ
    camera: {
        title: string
        bust: string
        full: string
        face: string
        save: string
        reset: string
    }
    // リップシンク
    lipSync: {
        title: string
        on: string
        off: string
    }
    // 自動表情
    autoExpression: {
        title: string
        on: string
        off: string
        interval: string
    }
    // 背景
    background: {
        title: string
        image: string
        video: string
        greenScreen: string
    }
    // アニメーション
    animation: {
        title: string
        file: string
    }
    // 出力/マイク
    outputMic: {
        title: string
    }
    // 色調補正
    colorAdjustment: {
        title: string
        brightness: string
        contrast: string
        saturation: string
        reset: string
    }
    // 仮想カメラ
    virtualCamera: {
        title: string
        start: string
        stop: string
        connecting: string
    }
    // 表情
    expressions: {
        neutral: string
        happy: string
        angry: string
        sad: string
        relaxed: string
        surprised: string
    }
    // アラート
    alerts: {
        cameraSaved: (preset: string) => string
        virtualCameraError: string
        virtualCameraFailed: string
    }
    // ドロップゾーン
    dropZone: {
        title: string
        description: string
    }
}

export const ja: Translations = {
    header: {
        loc: 'LoC',
        reload: '更新',
        window: 'ウィンドウ',
        preview: 'プレビュー',
        output: '出力'
    },
    vrmModel: {
        title: '👤 VRMモデル',
        replace: '🔄 入れ替え'
    },
    camera: {
        title: '📷 カメラ位置',
        bust: 'バストアップ',
        full: '全身',
        face: '顔アップ',
        save: '💾 記憶',
        reset: '🔄 リセット'
    },
    lipSync: {
        title: '🎤 リップシンク',
        on: 'ON',
        off: 'OFF'
    },
    autoExpression: {
        title: '🎭 自動表情',
        on: 'ON',
        off: 'OFF',
        interval: '間隔'
    },
    background: {
        title: '🖼️ 背景',
        image: '画像',
        video: '動画',
        greenScreen: 'GB'
    },
    animation: {
        title: '💃 アニメーション',
        file: '.vrma'
    },
    outputMic: {
        title: '📐 出力 / 🎙️ マイク'
    },
    colorAdjustment: {
        title: '🎨 色調補正',
        brightness: '明るさ',
        contrast: 'コントラスト',
        saturation: '彩度',
        reset: 'リセット'
    },
    virtualCamera: {
        title: '🎥 仮想カメラ',
        start: '🎥 仮想カメラ起動',
        stop: '🎥 仮想カメラ停止',
        connecting: '接続中...'
    },
    expressions: {
        neutral: '通常',
        happy: '笑顔',
        angry: '怒り',
        sad: '悲しい',
        relaxed: 'リラックス',
        surprised: '驚き'
    },
    alerts: {
        cameraSaved: (preset) => `${preset}のカメラ位置を記憶しました！`,
        virtualCameraError: '仮想カメラの起動に失敗しました。OBSを一度起動して「仮想カメラ開始」→「仮想カメラ停止」を行ってください。',
        virtualCameraFailed: '仮想カメラの起動に失敗しました。'
    },
    dropZone: {
        title: 'VRMファイルをドロップ',
        description: 'または クリックして選択'
    }
}
