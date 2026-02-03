import { useState, useCallback, useEffect, useRef } from 'react'
import { VRMViewer } from './components/VRMViewer'
import { DropZone } from './components/DropZone'
import { Controls } from './components/Controls'

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

function App(): JSX.Element {
    const [vrmUrl, setVrmUrl] = useState<string | null>(null)
    const [cameraPreset, setCameraPreset] = useState<'bust' | 'full' | 'face'>('bust')
    const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(false)
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
    const [outputSize, setOutputSize] = useState<OutputSize>('1280x720')
    const [isVirtualCameraOn, setIsVirtualCameraOn] = useState(false)
    const [isVirtualCameraConnecting, setIsVirtualCameraConnecting] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

    const handleFileDrop = useCallback((file: File) => {
        const url = URL.createObjectURL(file)
        setVrmUrl(url)
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

    return (
        <div className="app">
            <header className="app-header">
                <h1>リアライズ</h1>
                <p className="subtitle">VRM仮想カメラ</p>
                <div className="output-size-badge">📐 {outputSize}</div>
            </header>

            <main className="app-main">
                {vrmUrl ? (
                    <VRMViewer
                        vrmUrl={vrmUrl}
                        cameraPreset={cameraPreset}
                        isLipSyncEnabled={isLipSyncEnabled}
                        selectedDeviceId={selectedDeviceId}
                        backgroundImage={backgroundImage}
                        outputSize={outputSize}
                    />
                ) : (
                    <DropZone onFileDrop={handleFileDrop} />
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
