import { useState, useCallback, useEffect, useRef } from 'react'
import { VRMViewer } from './components/VRMViewer'
import { DropZone } from './components/DropZone'
import { Controls } from './components/Controls'
import { AnimationPlaylist } from './components/AnimationPlaylist'
import { VirtualCameraPreview } from './components/VirtualCameraPreview'
import { getTranslation, languageFlags, type Language } from './i18n'
import logoImage from './assets/logo.png'

// LoC (ビルド時に固定)
const LOC_COUNT = 4060

interface AudioDevice {
    deviceId: string
    label: string
}

// 16:9 アスペクト比の解像度（Zoom/Teams/Meet向け）
export type OutputSize = '1920x1080' | '1280x720' | '960x540' | '640x360'

const OUTPUT_SIZE_MAP: Record<OutputSize, { width: number; height: number; label: string }> = {
    '1920x1080': { width: 1920, height: 1080, label: '1080p (Full HD)' },
    '1280x720': { width: 1280, height: 720, label: '720p (HD) - 推奨' },
    '960x540': { width: 960, height: 540, label: '540p (qHD)' },
    '640x360': { width: 640, height: 360, label: '360p (低帯域)' }
}

export type ExpressionType = 'neutral' | 'happy' | 'angry' | 'sad' | 'relaxed' | 'surprised'

const EXPRESSION_ITEMS: { id: ExpressionType; emoji: string; label: string }[] = [
    { id: 'neutral', emoji: '😐', label: '通常' },
    { id: 'happy', emoji: '😊', label: '笑顔' },
    { id: 'angry', emoji: '😠', label: '怒り' },
    { id: 'sad', emoji: '😢', label: '悲しい' },
    { id: 'relaxed', emoji: '😌', label: 'ﾘﾗｯｸｽ' },
    { id: 'surprised', emoji: '😲', label: '驚き' }
]

export type ThemeType = 'dark-rum' | 'white-liquor' | 'wine-red' | 'sherry-cask'

export interface ColorAdjustment {
    brightness: number
    contrast: number
    saturation: number
}

// 永続化する設定
export interface AppSettings {
    lastVrmPath: string | null
    lastBackgroundPath: string | null
    cameraPreset: 'bust' | 'full' | 'face'
    isLipSyncEnabled: boolean
    isAutoExpression: boolean
    expressionInterval: number
    isGreenScreen: boolean
    outputSize: OutputSize
    colorAdjustment: ColorAdjustment
    theme: ThemeType
    customCameraPositions: {
        bust?: { position: [number, number, number]; target: [number, number, number] }
        full?: { position: [number, number, number]; target: [number, number, number] }
        face?: { position: [number, number, number]; target: [number, number, number] }
    }
    language: Language
}

// ブラウザのロケールから言語を自動検出
function detectLanguage(): Language {
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('ja')) return 'ja'
    if (browserLang.startsWith('ko')) return 'ko'
    if (browserLang.startsWith('zh')) return 'zh'
    return 'en' // デフォルトは英語
}

const DEFAULT_SETTINGS: AppSettings = {
    lastVrmPath: null,
    lastBackgroundPath: null,
    cameraPreset: 'bust',
    isLipSyncEnabled: true,
    isAutoExpression: true,
    expressionInterval: 5,
    isGreenScreen: false,
    outputSize: '1280x720',
    colorAdjustment: { brightness: 0, contrast: 0, saturation: 0 },
    theme: 'dark-rum',
    customCameraPositions: {},
    language: detectLanguage()
}

const SETTINGS_KEY = 'realize_cam_settings'

function loadSettings(): AppSettings {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            // outputSizeが有効な値かチェック（1440pは削除されたため無効）
            const validOutputSizes = ['1920x1080', '1280x720', '960x540', '640x360']
            if (parsed.outputSize && !validOutputSizes.includes(parsed.outputSize)) {
                parsed.outputSize = DEFAULT_SETTINGS.outputSize
            }
            return { ...DEFAULT_SETTINGS, ...parsed }
        }
    } catch (e) {
        console.error('Failed to load settings:', e)
    }
    return DEFAULT_SETTINGS
}

function saveSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (e) {
        console.error('Failed to save settings:', e)
    }
}

function App(): JSX.Element {
    // 保存された設定を読み込み
    const initialSettings = loadSettings()

    const [vrmUrl, setVrmUrl] = useState<string | null>(null)
    const [lastVrmPath, setLastVrmPath] = useState<string | null>(initialSettings.lastVrmPath)
    const [cameraPreset, setCameraPreset] = useState<'bust' | 'full' | 'face'>(initialSettings.cameraPreset)
    const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(initialSettings.isLipSyncEnabled)
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
    const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null)
    const [lastBackgroundPath, setLastBackgroundPath] = useState<string | null>(initialSettings.lastBackgroundPath)
    const [outputSize, setOutputSize] = useState<OutputSize>(initialSettings.outputSize)
    const [isVirtualCameraOn, setIsVirtualCameraOn] = useState(false)
    const [isVirtualCameraConnecting, setIsVirtualCameraConnecting] = useState(false)
    const [animationUrl, setAnimationUrl] = useState<string | null>(null)
    const [selectedAnimationPreset, setSelectedAnimationPreset] = useState<string | null>(null)
    // アニメーションプレイリスト
    const [animationQueue, setAnimationQueue] = useState<string[]>(['greeting'])
    const [animationStock, setAnimationStock] = useState<string[]>(
        ['fullbody', 'vsign', 'shoot', 'spin', 'pose', 'squat']
    )
    const [isAnimationLooping, setIsAnimationLooping] = useState(false)
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
    const [animationIntervalSecs, setAnimationIntervalSecs] = useState(5)
    const [intervalProgress, setIntervalProgress] = useState(0) // 0-100% カウントダウン
    const [isInInterval, setIsInInterval] = useState(false) // インターバル待機中
    const [currentExpression, setCurrentExpression] = useState<ExpressionType>('happy')
    const [colorAdjustment, setColorAdjustment] = useState<ColorAdjustment>(initialSettings.colorAdjustment)
    const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 })
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
    const [isAutoExpression, setIsAutoExpression] = useState(initialSettings.isAutoExpression)
    const [expressionInterval, setExpressionInterval] = useState(initialSettings.expressionInterval)
    const [expressionQueue, setExpressionQueue] = useState<ExpressionType[]>(
        ['neutral', 'happy', 'relaxed']
    )
    const [expressionStock, setExpressionStock] = useState<ExpressionType[]>(
        ['angry', 'sad', 'surprised']
    )
    const [expressionQueueIndex, setExpressionQueueIndex] = useState(0)
    const [isGreenScreen, setIsGreenScreen] = useState(initialSettings.isGreenScreen)
    const [theme, setTheme] = useState<ThemeType>(initialSettings.theme)
    const [customCameraPositions, setCustomCameraPositions] = useState<{
        bust?: { position: [number, number, number]; target: [number, number, number] }
        full?: { position: [number, number, number]; target: [number, number, number] }
        face?: { position: [number, number, number]; target: [number, number, number] }
    }>(initialSettings.customCameraPositions || {})
    const [fps, setFps] = useState(0)
    const [language, setLanguage] = useState<Language>(initialSettings.language)
    const t = getTranslation(language)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const autoExpressionRef = useRef<NodeJS.Timeout | null>(null)
    const cameraRef = useRef<{
        getPosition: () => { position: [number, number, number]; target: [number, number, number] }
    } | null>(null)

    // カメラ位置を記憶（現在のプリセットに対して）
    const saveCameraPosition = useCallback(() => {
        if (cameraRef.current) {
            const pos = cameraRef.current.getPosition()
            setCustomCameraPositions(prev => ({
                ...prev,
                [cameraPreset]: pos
            }))
            const presetNames = { bust: 'バストアップ', full: '全身', face: '顔アップ' }
            alert(`${presetNames[cameraPreset]}のカメラ位置を記憶しました！`)
        }
    }, [cameraPreset])

    // テーマをHTMLに適用
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // ウィンドウサイズを監視
    useEffect(() => {
        const handleResize = (): void => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ホットリロード日時
    const [reloadTime] = useState(() => {
        const now = new Date()
        return `${now.getMonth() + 1}/${now.getDate()} ${now.toLocaleTimeString('ja-JP')}`
    })

    // 設定を自動保存
    useEffect(() => {
        const settings: AppSettings = {
            lastVrmPath,
            lastBackgroundPath,
            cameraPreset,
            isLipSyncEnabled,
            isAutoExpression,
            expressionInterval,
            isGreenScreen,
            outputSize,
            colorAdjustment,
            theme,
            customCameraPositions,
            language
        }
        saveSettings(settings)
    }, [lastVrmPath, lastBackgroundPath, cameraPreset, isLipSyncEnabled, isAutoExpression, expressionInterval, isGreenScreen, outputSize, colorAdjustment, theme, customCameraPositions, language])

    // ファイルパスからVRMを読み込む
    const loadVrmFromPath = useCallback(async (filePath: string) => {
        try {
            const buffer = await window.api.file.readAsBuffer(filePath)
            if (buffer) {
                const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/octet-stream' })
                const url = URL.createObjectURL(blob)
                setVrmUrl(url)
                setLastVrmPath(filePath)
            }
        } catch (error) {
            console.error('Failed to load VRM:', error)
            // ファイルが見つからない場合はパスをクリア
            setLastVrmPath(null)
        }
    }, [])

    // ファイルパスから背景を読み込む
    const loadBackgroundFromPath = useCallback(async (filePath: string) => {
        try {
            const buffer = await window.api.file.readAsBuffer(filePath)
            if (buffer) {
                const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'image/*' })
                const url = URL.createObjectURL(blob)
                setBackgroundImage(url)
                setLastBackgroundPath(filePath)
            }
        } catch (error) {
            console.error('Failed to load background:', error)
            setLastBackgroundPath(null)
        }
    }, [])

    // 起動時に保存された背景画像を読み込む
    useEffect(() => {
        if (lastBackgroundPath && !backgroundImage) {
            loadBackgroundFromPath(lastBackgroundPath)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const [expressionProgress, setExpressionProgress] = useState(0)

    // 自動表情ループ（順番ベース：expressionQueueの左から順）
    useEffect(() => {
        if (!isAutoExpression || expressionQueue.length === 0) {
            if (autoExpressionRef.current) {
                clearInterval(autoExpressionRef.current)
                autoExpressionRef.current = null
            }
            setExpressionProgress(0)
            return
        }

        // 最初の表情を設定
        setExpressionQueueIndex(0)
        setCurrentExpression(expressionQueue[0])
        setExpressionProgress(0)

        const startTime = { current: performance.now() }
        const intervalMs = expressionInterval * 1000
        let currentIdx = 0

        // requestAnimationFrame でプログレス更新
        let rafId: number
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime.current
            const progress = Math.min((elapsed / intervalMs) * 100, 100)
            setExpressionProgress(progress)

            if (elapsed >= intervalMs) {
                // 次の表情へ
                currentIdx = (currentIdx + 1) % expressionQueue.length
                setExpressionQueueIndex(currentIdx)
                setCurrentExpression(expressionQueue[currentIdx])
                setExpressionProgress(0)
                startTime.current = performance.now()
            }

            rafId = requestAnimationFrame(animate)
        }
        rafId = requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(rafId)
            if (autoExpressionRef.current) {
                clearInterval(autoExpressionRef.current)
            }
        }
    }, [isAutoExpression, expressionInterval, expressionQueue])

    // オーディオデバイスを取得
    useEffect(() => {
        const getAudioDevices = async (): Promise<void> => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true })
                const devices = await navigator.mediaDevices.enumerateDevices()
                const audioInputs = devices
                    .filter((device) => device.kind === 'audioinput')
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label: device.label || `マイク ${device.deviceId.slice(0, 8)}`
                    }))

                setAudioDevices(audioInputs)
                if (audioInputs.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(audioInputs[0].deviceId)
                }
            } catch (error) {
                console.error('Failed to get audio devices:', error)
            }
        }

        getAudioDevices()
        navigator.mediaDevices.addEventListener('devicechange', getAudioDevices)
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices)
        }
    }, [])

    // 仮想カメラアクティブフラグ（クロージャ問題を回避するためにrefを使用）
    const isVirtualCameraActiveRef = useRef(false)
    const outputSizeRef = useRef(outputSize)

    // outputSizeの変更をrefに反映
    useEffect(() => {
        outputSizeRef.current = outputSize
    }, [outputSize])

    // 仮想カメラへのフレーム送信
    const sendFrameToVirtualCamera = useCallback(async () => {
        if (!isVirtualCameraActiveRef.current || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Three.jsキャンバスを取得
        const threeCanvas = document.querySelector('.vrm-viewer canvas') as HTMLCanvasElement
        if (!threeCanvas) return

        const { width, height } = OUTPUT_SIZE_MAP[outputSizeRef.current]
        canvas.width = width
        canvas.height = height

        // Three.jsキャンバスをリサイズして描画
        ctx.drawImage(threeCanvas, 0, 0, width, height)

        // RGBAデータを取得
        const imageData = ctx.getImageData(0, 0, width, height)
        const frameData = new Uint8Array(imageData.data.buffer)

        try {
            await window.api.virtualCamera.sendFrame(frameData)
        } catch (error) {
            console.error('Failed to send frame:', error)
        }
    }, [])

    // 仮想カメラのON/OFF
    const handleVirtualCameraToggle = useCallback(async () => {
        if (isVirtualCameraOn) {
            // 停止
            isVirtualCameraActiveRef.current = false
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current)
                frameIntervalRef.current = null
            }
            await window.api.virtualCamera.stop()
            setIsVirtualCameraOn(false)
        } else {
            // 開始
            setIsVirtualCameraConnecting(true)
            try {
                const { width, height } = OUTPUT_SIZE_MAP[outputSize]
                const success = await window.api.virtualCamera.start(width, height, 30)
                if (success) {
                    setIsVirtualCameraOn(true)
                    isVirtualCameraActiveRef.current = true
                    // フレーム送信を開始 (30fps = 約33ms間隔)
                    frameIntervalRef.current = setInterval(sendFrameToVirtualCamera, 33)
                } else {
                    alert('仮想カメラの起動に失敗しました。OBSを一度起動して「仮想カメラ開始」→「仮想カメラ停止」を行ってください。')
                }
            } catch (error) {
                console.error('Failed to start virtual camera:', error)
                alert('仮想カメラの起動に失敗しました。')
            } finally {
                setIsVirtualCameraConnecting(false)
            }
        }
    }, [isVirtualCameraOn, outputSize, sendFrameToVirtualCamera])

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current)
            }
            window.api.virtualCamera.stop()
        }
    }, [])

    const handleFileDrop = useCallback((file: File, filePath: string | null) => {
        const url = URL.createObjectURL(file)
        setVrmUrl(url)
        if (filePath) {
            setLastVrmPath(filePath)
        }
    }, [])

    const handleBackgroundChange = useCallback(
        (file: File | null, filePath?: string | null) => {
            if (backgroundImage) {
                URL.revokeObjectURL(backgroundImage)
            }
            // 画像選択時は動画をクリア
            if (backgroundVideo) {
                URL.revokeObjectURL(backgroundVideo)
                setBackgroundVideo(null)
            }
            if (file) {
                const url = URL.createObjectURL(file)
                setBackgroundImage(url)
                // ファイルパスがあれば保存
                if (filePath) {
                    setLastBackgroundPath(filePath)
                }
            } else {
                setBackgroundImage(null)
                setLastBackgroundPath(null)
            }
        },
        [backgroundImage, backgroundVideo]
    )

    const handleBackgroundVideoChange = useCallback(
        (file: File | null) => {
            // 動画選択時は画像をクリア
            if (backgroundImage) {
                URL.revokeObjectURL(backgroundImage)
                setBackgroundImage(null)
            }
            if (backgroundVideo) {
                URL.revokeObjectURL(backgroundVideo)
            }
            if (file) {
                const url = URL.createObjectURL(file)
                setBackgroundVideo(url)
            } else {
                setBackgroundVideo(null)
            }
        },
        [backgroundImage, backgroundVideo]
    )

    const handleAnimationChange = useCallback(
        (file: File | null) => {
            if (animationUrl) {
                URL.revokeObjectURL(animationUrl)
            }
            if (file) {
                const url = URL.createObjectURL(file)
                setAnimationUrl(url)
                setSelectedAnimationPreset(null) // カスタムファイル選択時はプリセット解除
            } else {
                setAnimationUrl(null)
            }
        },
        [animationUrl]
    )

    // プリセットアニメーション変更ハンドラ
    const handleAnimationPresetChange = useCallback(
        async (presetId: string | null) => {
            // 現在のアニメーションをクリア
            if (animationUrl) {
                URL.revokeObjectURL(animationUrl)
                setAnimationUrl(null)
            }

            if (!presetId) {
                setSelectedAnimationPreset(null)
                return
            }

            try {
                // プリセットVRMAを取得（Uint8Arrayで受信）
                console.log('Requesting preset:', presetId)
                const data = await window.api.vrma.getPreset(presetId)
                console.log('Received data:', data)
                if (data) {
                    const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' })
                    const url = URL.createObjectURL(blob)
                    console.log('Created URL:', url)
                    setAnimationUrl(url)
                    setSelectedAnimationPreset(presetId)
                }
            } catch (error) {
                console.error('Failed to load animation preset:', error)
            }
        },
        [animationUrl]
    )

    // ループ再生開始時にキューの先頭アニメーションを再生
    useEffect(() => {
        if (isAnimationLooping && animationQueue.length > 0) {
            const firstPreset = animationQueue[currentQueueIndex]
            if (firstPreset && selectedAnimationPreset !== firstPreset) {
                handleAnimationPresetChange(firstPreset)
            }
        }
    }, [isAnimationLooping, animationQueue])

    // ループ停止時にアニメーション停止
    useEffect(() => {
        if (!isAnimationLooping && selectedAnimationPreset) {
            handleAnimationPresetChange(null)
            setCurrentQueueIndex(0)
        }
    }, [isAnimationLooping])

    // アニメーション終了時：インターバル待機後に次のアニメーションを再生
    const handleAnimationEnd = useCallback(() => {
        if (!isAnimationLooping || animationQueue.length === 0) return

        // インターバルが0の場合は即座に次へ
        if (animationIntervalSecs === 0) {
            const nextIndex = (currentQueueIndex + 1) % animationQueue.length
            setCurrentQueueIndex(nextIndex)
            const nextPreset = animationQueue[nextIndex]
            if (nextPreset) {
                handleAnimationPresetChange(nextPreset)
            }
            return
        }

        // インターバル開始
        setIsInInterval(true)
        setIntervalProgress(100)
        const startTime = performance.now()
        const intervalMs = animationIntervalSecs * 1000

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const remaining = Math.max(0, 100 - (elapsed / intervalMs) * 100)
            setIntervalProgress(remaining)

            if (elapsed >= intervalMs) {
                setIsInInterval(false)
                setIntervalProgress(0)

                // 次のアニメーション
                const nextIndex = (currentQueueIndex + 1) % animationQueue.length
                setCurrentQueueIndex(nextIndex)
                const nextPreset = animationQueue[nextIndex]
                if (nextPreset) {
                    handleAnimationPresetChange(nextPreset)
                }
            } else {
                requestAnimationFrame(animate)
            }
        }
        requestAnimationFrame(animate)
    }, [isAnimationLooping, animationQueue, currentQueueIndex, animationIntervalSecs, handleAnimationPresetChange])


    return (
        <div className="app">
            <header className="app-header">
                <div className="header-logo">
                    <img src={logoImage} alt="Realize Virtual Camera" className="logo-image" />
                </div>
                <div className="header-info">
                    <span className="size-badge">📺 {windowSize.width}×{windowSize.height}</span>
                    <span className="fps-badge">⚡ {fps} FPS</span>
                </div>
                <div className="resolution-info">
                    <span className="resolution-badge loc">
                        📝 {LOC_COUNT} LoC
                    </span>
                    <span className="resolution-badge reload">
                        🔄 {reloadTime}
                    </span>
                    <span className="resolution-badge window">
                        🖥️ {windowSize.width}x{windowSize.height}
                    </span>
                    <span className="resolution-badge preview">
                        👁️ {previewSize.width}x{previewSize.height}
                    </span>
                    <span className={`resolution-badge output ${isVirtualCameraOn ? 'active' : ''}`}>
                        🎥 {outputSize}
                    </span>
                    <div className="theme-selector">
                        <button
                            className={`theme-btn ${theme === 'dark-rum' ? 'active' : ''}`}
                            data-theme="dark-rum"
                            onClick={() => setTheme('dark-rum')}
                            title="ダークラム"
                        />
                        <button
                            className={`theme-btn ${theme === 'white-liquor' ? 'active' : ''}`}
                            data-theme="white-liquor"
                            onClick={() => setTheme('white-liquor')}
                            title="ホワイトリーカー"
                        />
                        <button
                            className={`theme-btn ${theme === 'wine-red' ? 'active' : ''}`}
                            data-theme="wine-red"
                            onClick={() => setTheme('wine-red')}
                            title="ワインレッド"
                        />
                        <button
                            className={`theme-btn ${theme === 'sherry-cask' ? 'active' : ''}`}
                            data-theme="sherry-cask"
                            onClick={() => setTheme('sherry-cask')}
                            title="シェリーカスク"
                        />
                    </div>
                </div>
                <div className="language-switcher">
                    {(['ja', 'en', 'zh', 'ko'] as Language[]).map((lang) => (
                        <button
                            key={lang}
                            className={`lang-btn ${language === lang ? 'active' : ''}`}
                            onClick={() => setLanguage(lang)}
                            title={lang.toUpperCase()}
                        >
                            {languageFlags[lang]}
                        </button>
                    ))}
                </div>
            </header>

            <main className="app-main">
                {vrmUrl ? (
                    <>
                        <VRMViewer
                            vrmUrl={vrmUrl}
                            cameraPreset={cameraPreset}
                            isLipSyncEnabled={isLipSyncEnabled}
                            selectedDeviceId={selectedDeviceId}
                            backgroundImage={backgroundImage}
                            backgroundVideo={backgroundVideo}
                            isGreenScreen={isGreenScreen}
                            outputSize={outputSize}
                            animationUrl={animationUrl}
                            expression={currentExpression}
                            colorAdjustment={colorAdjustment}
                            onPreviewSizeChange={setPreviewSize}
                            onFpsChange={setFps}
                            onAnimationEnd={handleAnimationEnd}
                            customCameraPosition={customCameraPositions[cameraPreset] || null}
                            cameraRef={cameraRef}
                        />
                        <div className="expression-playlist">
                            <div className="expression-lane expression-queue"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    const fromLane = e.dataTransfer.getData('expression-lane')
                                    const fromIndex = Number(e.dataTransfer.getData('expression-index'))
                                    if (fromLane === 'stock' && !isNaN(fromIndex)) {
                                        const expr = expressionStock[fromIndex]
                                        setExpressionStock(prev => prev.filter((_, i) => i !== fromIndex))
                                        setExpressionQueue(prev => [...prev, expr])
                                    }
                                }}
                            >
                                {expressionQueue.map((exprId: ExpressionType, index: number) => {
                                    const item = EXPRESSION_ITEMS.find(i => i.id === exprId)
                                    if (!item) return null
                                    const isActive = currentExpression === exprId
                                    const isNext = isAutoExpression && expressionQueue[(expressionQueueIndex + 1) % expressionQueue.length] === exprId
                                    return (
                                        <button
                                            key={item.id}
                                            className={`expression-btn ${isActive ? 'active' : ''} ${isActive && isAutoExpression ? 'countdown' : ''} ${isNext ? 'next' : ''}`}
                                            onClick={() => setCurrentExpression(exprId)}
                                            style={isActive && isAutoExpression ? { '--progress': `${expressionProgress}%` } as React.CSSProperties : {}}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('expression-lane', 'queue')
                                                e.dataTransfer.setData('expression-index', String(index))
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const fromLane = e.dataTransfer.getData('expression-lane')
                                                const fromIndex = Number(e.dataTransfer.getData('expression-index'))
                                                if (isNaN(fromIndex)) return
                                                if (fromLane === 'queue') {
                                                    if (fromIndex === index) return
                                                    const newQueue = [...expressionQueue]
                                                    const [moved] = newQueue.splice(fromIndex, 1)
                                                    newQueue.splice(index, 0, moved)
                                                    setExpressionQueue(newQueue)
                                                } else if (fromLane === 'stock') {
                                                    const expr = expressionStock[fromIndex]
                                                    setExpressionStock(prev => prev.filter((_, i) => i !== fromIndex))
                                                    const newQueue = [...expressionQueue]
                                                    newQueue.splice(index, 0, expr)
                                                    setExpressionQueue(newQueue)
                                                }
                                            }}
                                        >
                                            <span className="emoji">{item.emoji}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    )
                                })}
                                {expressionQueue.length === 0 && <div className="empty-hint">ドロップ</div>}
                            </div>
                            <div className="expression-divider" />
                            <div className="expression-lane expression-stock"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    const fromLane = e.dataTransfer.getData('expression-lane')
                                    const fromIndex = Number(e.dataTransfer.getData('expression-index'))
                                    if (fromLane === 'queue' && !isNaN(fromIndex)) {
                                        const expr = expressionQueue[fromIndex]
                                        setExpressionQueue(prev => prev.filter((_, i) => i !== fromIndex))
                                        setExpressionStock(prev => [...prev, expr])
                                    }
                                }}
                            >
                                {expressionStock.map((exprId: ExpressionType, index: number) => {
                                    const item = EXPRESSION_ITEMS.find(i => i.id === exprId)
                                    if (!item) return null
                                    return (
                                        <button
                                            key={item.id}
                                            className="expression-btn stock"
                                            onClick={() => setCurrentExpression(exprId)}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('expression-lane', 'stock')
                                                e.dataTransfer.setData('expression-index', String(index))
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const fromLane = e.dataTransfer.getData('expression-lane')
                                                const fromIndex = Number(e.dataTransfer.getData('expression-index'))
                                                if (isNaN(fromIndex)) return
                                                if (fromLane === 'stock') {
                                                    if (fromIndex === index) return
                                                    const newStock = [...expressionStock]
                                                    const [moved] = newStock.splice(fromIndex, 1)
                                                    newStock.splice(index, 0, moved)
                                                    setExpressionStock(newStock)
                                                } else if (fromLane === 'queue') {
                                                    const expr = expressionQueue[fromIndex]
                                                    setExpressionQueue(prev => prev.filter((_, i) => i !== fromIndex))
                                                    const newStock = [...expressionStock]
                                                    newStock.splice(index, 0, expr)
                                                    setExpressionStock(newStock)
                                                }
                                            }}
                                        >
                                            <span className="emoji">{item.emoji}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    )
                                })}
                                {expressionStock.length === 0 && <div className="empty-hint">ストック</div>}
                            </div>
                            <div className="expression-loop-control">
                                <button
                                    className={`loop-toggle ${isAutoExpression ? 'active' : ''}`}
                                    onClick={() => setIsAutoExpression(!isAutoExpression)}
                                    title={isAutoExpression ? 'ループ停止' : 'ループ開始'}
                                >
                                    {isAutoExpression ? '⏹️' : '▶️'}
                                </button>
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={expressionInterval}
                                    onChange={(e) => setExpressionInterval(Number(e.target.value))}
                                    className="interval-slider"
                                    title={`インターバル: ${expressionInterval}秒`}
                                />
                                <span className="interval-label">{expressionInterval}s</span>
                            </div>
                        </div>
                        <AnimationPlaylist
                            queue={animationQueue}
                            stock={animationStock}
                            onQueueChange={setAnimationQueue}
                            onStockChange={setAnimationStock}
                            currentPlayingId={selectedAnimationPreset}
                            isLooping={isAnimationLooping}
                            onLoopToggle={() => setIsAnimationLooping(!isAnimationLooping)}
                            intervalSecs={animationIntervalSecs}
                            onIntervalChange={setAnimationIntervalSecs}
                            intervalProgress={intervalProgress}
                            onPlayAnimation={(id) => handleAnimationPresetChange(id)}
                            t={t}
                        />
                    </>
                ) : (
                    <DropZone
                        onFileDrop={handleFileDrop}
                        lastVrmPath={lastVrmPath}
                        onLoadLastVrm={() => {
                            if (lastVrmPath) {
                                loadVrmFromPath(lastVrmPath)
                            }
                        }}
                        t={t}
                    />
                )}
            </main>

            <aside className="app-controls">
                <Controls
                    cameraPreset={cameraPreset}
                    onCameraPresetChange={setCameraPreset}
                    isLipSyncEnabled={isLipSyncEnabled}
                    onLipSyncToggle={() => setIsLipSyncEnabled(!isLipSyncEnabled)}
                    audioDevices={audioDevices}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceChange={setSelectedDeviceId}
                    backgroundImage={backgroundImage}
                    onBackgroundChange={handleBackgroundChange}
                    backgroundVideo={backgroundVideo}
                    onBackgroundVideoChange={handleBackgroundVideoChange}
                    outputSize={outputSize}
                    onOutputSizeChange={setOutputSize}
                    isVirtualCameraOn={isVirtualCameraOn}
                    isVirtualCameraConnecting={isVirtualCameraConnecting}
                    onVirtualCameraToggle={handleVirtualCameraToggle}
                    onClearVrm={() => {
                        if (vrmUrl) {
                            URL.revokeObjectURL(vrmUrl)
                            setVrmUrl(null)
                        }
                    }}
                    hasVrm={!!vrmUrl}
                    animationUrl={animationUrl}
                    onAnimationChange={handleAnimationChange}
                    selectedAnimationPreset={selectedAnimationPreset}
                    onAnimationPresetChange={handleAnimationPresetChange}
                    colorAdjustment={colorAdjustment}
                    onColorAdjustmentChange={setColorAdjustment}
                    expression={currentExpression}
                    onExpressionChange={setCurrentExpression}
                    isGreenScreen={isGreenScreen}
                    onGreenScreenToggle={() => setIsGreenScreen(!isGreenScreen)}
                    onSaveCameraPosition={saveCameraPosition}
                    hasCustomCameraPosition={!!customCameraPositions[cameraPreset]}
                    onResetCameraPosition={() => setCustomCameraPositions(prev => {
                        const newPositions = { ...prev }
                        delete newPositions[cameraPreset]
                        return newPositions
                    })}
                    t={t}
                />
                <VirtualCameraPreview isVirtualCameraOn={isVirtualCameraOn} t={t} />
            </aside>

            {/* 仮想カメラ用の隠しキャンバス */}
            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
                width={OUTPUT_SIZE_MAP[outputSize].width}
                height={OUTPUT_SIZE_MAP[outputSize].height}
            />
        </div>
    )
}

export default App
