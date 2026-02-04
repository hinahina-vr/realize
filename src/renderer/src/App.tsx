import { useState, useCallback, useEffect, useRef } from 'react'
import { VRMViewer } from './components/VRMViewer'
import { DropZone } from './components/DropZone'
import { Controls } from './components/Controls'
import logoImage from './assets/logo.png'

// LoC (ビルド時に固定)
const LOC_COUNT = 1602

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
    theme: 'dark-rum'
}

const SETTINGS_KEY = 'realize_settings'

function loadSettings(): AppSettings {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY)
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
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
    const [lastBackgroundPath, setLastBackgroundPath] = useState<string | null>(initialSettings.lastBackgroundPath)
    const [outputSize, setOutputSize] = useState<OutputSize>(initialSettings.outputSize)
    const [isVirtualCameraOn, setIsVirtualCameraOn] = useState(false)
    const [isVirtualCameraConnecting, setIsVirtualCameraConnecting] = useState(false)
    const [animationUrl, setAnimationUrl] = useState<string | null>(null)
    const [currentExpression, setCurrentExpression] = useState<ExpressionType>('happy')
    const [colorAdjustment, setColorAdjustment] = useState<ColorAdjustment>(initialSettings.colorAdjustment)
    const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 })
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
    const [isAutoExpression, setIsAutoExpression] = useState(initialSettings.isAutoExpression)
    const [expressionInterval, setExpressionInterval] = useState(initialSettings.expressionInterval)
    const [isGreenScreen, setIsGreenScreen] = useState(initialSettings.isGreenScreen)
    const [theme, setTheme] = useState<ThemeType>(initialSettings.theme)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const autoExpressionRef = useRef<NodeJS.Timeout | null>(null)

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
            theme
        }
        saveSettings(settings)
    }, [lastVrmPath, lastBackgroundPath, cameraPreset, isLipSyncEnabled, isAutoExpression, expressionInterval, isGreenScreen, outputSize, colorAdjustment, theme])

    // ファイルパスからVRMを読み込む
    const loadVrmFromPath = useCallback(async (filePath: string) => {
        try {
            const buffer = await window.api.file.readAsBuffer(filePath)
            if (buffer) {
                const blob = new Blob([buffer], { type: 'application/octet-stream' })
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
                const blob = new Blob([buffer], { type: 'image/*' })
                const url = URL.createObjectURL(blob)
                setBackgroundImage(url)
                setLastBackgroundPath(filePath)
            }
        } catch (error) {
            console.error('Failed to load background:', error)
            setLastBackgroundPath(null)
        }
    }, [])

    // 自動ループする表情のリスト（通常、笑顔、リラックス）
    const loopExpressions: ExpressionType[] = ['neutral', 'happy', 'relaxed']
    const [nextExpressionIndex, setNextExpressionIndex] = useState(0)
    const [expressionProgress, setExpressionProgress] = useState(0)

    // ランダムに次の表情を選択（現在の表情以外から）
    const getRandomNextIndex = (currentIndex: number): number => {
        let next: number
        do {
            next = Math.floor(Math.random() * loopExpressions.length)
        } while (next === currentIndex && loopExpressions.length > 1)
        return next
    }

    // 自動表情ループ（ランダム）
    useEffect(() => {
        if (!isAutoExpression) {
            if (autoExpressionRef.current) {
                clearInterval(autoExpressionRef.current)
                autoExpressionRef.current = null
            }
            setExpressionProgress(0)
            return
        }

        // 最初の表情をランダムに設定
        let currentIdx = Math.floor(Math.random() * loopExpressions.length)
        setCurrentExpression(loopExpressions[currentIdx])
        let nextIdx = getRandomNextIndex(currentIdx)
        setNextExpressionIndex(nextIdx)
        setExpressionProgress(0)

        // 進捗更新（100msごと）
        const progressInterval = setInterval(() => {
            setExpressionProgress((prev) => {
                const step = 100 / (expressionInterval * 10)
                return Math.min(prev + step, 100)
            })
        }, 100)

        // 表情変更
        autoExpressionRef.current = setInterval(() => {
            currentIdx = nextIdx
            setCurrentExpression(loopExpressions[currentIdx])
            nextIdx = getRandomNextIndex(currentIdx)
            setNextExpressionIndex(nextIdx)
            setExpressionProgress(0)
        }, expressionInterval * 1000)

        return () => {
            if (autoExpressionRef.current) {
                clearInterval(autoExpressionRef.current)
            }
            clearInterval(progressInterval)
        }
    }, [isAutoExpression, expressionInterval])

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
        (file: File | null) => {
            if (backgroundImage) {
                URL.revokeObjectURL(backgroundImage)
            }
            if (file) {
                const url = URL.createObjectURL(file)
                setBackgroundImage(url)
            } else {
                setBackgroundImage(null)
            }
        },
        [backgroundImage]
    )

    const handleAnimationChange = useCallback(
        (file: File | null) => {
            if (animationUrl) {
                URL.revokeObjectURL(animationUrl)
            }
            if (file) {
                const url = URL.createObjectURL(file)
                setAnimationUrl(url)
            } else {
                setAnimationUrl(null)
            }
        },
        [animationUrl]
    )

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-logo">
                    <img src={logoImage} alt="Project Realize" className="logo-image" />
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
                            isGreenScreen={isGreenScreen}
                            outputSize={outputSize}
                            animationUrl={animationUrl}
                            expression={currentExpression}
                            colorAdjustment={colorAdjustment}
                            onPreviewSizeChange={setPreviewSize}
                        />
                        <div className="expression-buttons">
                            <button
                                className={`expression-btn ${currentExpression === 'neutral' ? 'active' : ''} ${isAutoExpression && currentExpression === 'neutral' ? 'countdown' : ''} ${isAutoExpression && loopExpressions[nextExpressionIndex] === 'neutral' ? 'next' : ''}`}
                                onClick={() => setCurrentExpression('neutral')}
                                style={isAutoExpression && currentExpression === 'neutral' ? { '--progress': `${expressionProgress}%` } as React.CSSProperties : {}}
                            >
                                <span className="emoji">😐</span>
                                <span>通常</span>
                            </button>
                            <button
                                className={`expression-btn ${currentExpression === 'happy' ? 'active' : ''} ${isAutoExpression && currentExpression === 'happy' ? 'countdown' : ''} ${isAutoExpression && loopExpressions[nextExpressionIndex] === 'happy' ? 'next' : ''}`}
                                onClick={() => setCurrentExpression('happy')}
                                style={isAutoExpression && currentExpression === 'happy' ? { '--progress': `${expressionProgress}%` } as React.CSSProperties : {}}
                            >
                                <span className="emoji">😊</span>
                                <span>笑顔</span>
                            </button>
                            <button
                                className={`expression-btn ${currentExpression === 'angry' ? 'active' : ''}`}
                                onClick={() => setCurrentExpression('angry')}
                            >
                                <span className="emoji">😠</span>
                                <span>怒り</span>
                            </button>
                            <button
                                className={`expression-btn ${currentExpression === 'sad' ? 'active' : ''}`}
                                onClick={() => setCurrentExpression('sad')}
                            >
                                <span className="emoji">😢</span>
                                <span>悲しい</span>
                            </button>
                            <button
                                className={`expression-btn ${currentExpression === 'relaxed' ? 'active' : ''} ${isAutoExpression && currentExpression === 'relaxed' ? 'countdown' : ''} ${isAutoExpression && loopExpressions[nextExpressionIndex] === 'relaxed' ? 'next' : ''}`}
                                onClick={() => setCurrentExpression('relaxed')}
                                style={isAutoExpression && currentExpression === 'relaxed' ? { '--progress': `${expressionProgress}%` } as React.CSSProperties : {}}
                            >
                                <span className="emoji">😌</span>
                                <span>ﾘﾗｯｸｽ</span>
                            </button>
                            <button
                                className={`expression-btn ${currentExpression === 'surprised' ? 'active' : ''}`}
                                onClick={() => setCurrentExpression('surprised')}
                            >
                                <span className="emoji">😲</span>
                                <span>驚き</span>
                            </button>
                        </div>
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
                    colorAdjustment={colorAdjustment}
                    onColorAdjustmentChange={setColorAdjustment}
                    expression={currentExpression}
                    onExpressionChange={setCurrentExpression}
                    isAutoExpression={isAutoExpression}
                    onAutoExpressionToggle={() => setIsAutoExpression(!isAutoExpression)}
                    expressionInterval={expressionInterval}
                    onExpressionIntervalChange={setExpressionInterval}
                    isGreenScreen={isGreenScreen}
                    onGreenScreenToggle={() => setIsGreenScreen(!isGreenScreen)}
                />
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
