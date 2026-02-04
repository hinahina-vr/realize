import { useCallback } from 'react'
import type { OutputSize, ColorAdjustment, ExpressionType } from '../App'

interface AudioDevice {
    deviceId: string
    label: string
}

interface ControlsProps {
    cameraPreset: 'bust' | 'full' | 'face'
    onCameraPresetChange: (preset: 'bust' | 'full' | 'face') => void
    isLipSyncEnabled: boolean
    onLipSyncToggle: () => void
    audioDevices: AudioDevice[]
    selectedDeviceId: string
    onDeviceChange: (deviceId: string) => void
    backgroundImage: string | null
    onBackgroundChange: (file: File | null) => void
    isGreenScreen: boolean
    onGreenScreenToggle: () => void
    outputSize: OutputSize
    onOutputSizeChange: (size: OutputSize) => void
    isVirtualCameraOn: boolean
    isVirtualCameraConnecting: boolean
    onVirtualCameraToggle: () => void
    onClearVrm: () => void
    hasVrm: boolean
    animationUrl: string | null
    onAnimationChange: (file: File | null) => void
    colorAdjustment: ColorAdjustment
    onColorAdjustmentChange: (adjustment: ColorAdjustment) => void
    expression: ExpressionType
    onExpressionChange: (expression: ExpressionType) => void
    isAutoExpression: boolean
    onAutoExpressionToggle: () => void
    expressionInterval: number
    onExpressionIntervalChange: (interval: number) => void
}

const OUTPUT_SIZES: { value: OutputSize; label: string }[] = [
    { value: '1920x1080', label: '1080p (Full HD)' },
    { value: '1280x720', label: '720p (HD) - 推奨' },
    { value: '960x540', label: '540p (qHD)' },
    { value: '640x360', label: '360p (低帯域)' }
]

export function Controls({
    cameraPreset,
    onCameraPresetChange,
    isLipSyncEnabled,
    onLipSyncToggle,
    audioDevices,
    selectedDeviceId,
    onDeviceChange,
    backgroundImage,
    onBackgroundChange,
    isGreenScreen,
    onGreenScreenToggle,
    outputSize,
    onOutputSizeChange,
    isVirtualCameraOn,
    isVirtualCameraConnecting,
    onVirtualCameraToggle,
    onClearVrm,
    hasVrm,
    animationUrl,
    onAnimationChange,
    colorAdjustment,
    onColorAdjustmentChange,
    expression,
    onExpressionChange,
    isAutoExpression,
    onAutoExpressionToggle,
    expressionInterval,
    onExpressionIntervalChange
}: ControlsProps): JSX.Element {
    const handleBackgroundSelect = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                onBackgroundChange(files[0])
                // 画像選択時はグリーンバックをOFFに
                if (isGreenScreen) {
                    onGreenScreenToggle()
                }
            }
        }
        input.click()
    }, [onBackgroundChange, isGreenScreen, onGreenScreenToggle])

    const handleAnimationSelect = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.vrma'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                onAnimationChange(files[0])
            }
        }
        input.click()
    }, [onAnimationChange])

    return (
        <div className="controls">

            <h3>👤 VRMモデル</h3>
            <div className="control-group">
                <button className="control-button" onClick={onClearVrm}>
                    🔄 入れ替え
                </button>
            </div>

            <h3>📷 カメラ位置</h3>
            <div className="control-group">
                <button
                    className={`control-button ${cameraPreset === 'bust' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('bust')}
                >
                    バストアップ
                </button>
                <button
                    className={`control-button ${cameraPreset === 'full' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('full')}
                >
                    全身
                </button>
                <button
                    className={`control-button ${cameraPreset === 'face' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('face')}
                >
                    顔アップ
                </button>
            </div>

            <h3>🎤 リップシンク</h3>
            <div className="control-group">
                <button
                    className={`control-button toggle ${isLipSyncEnabled ? 'active' : ''}`}
                    onClick={onLipSyncToggle}
                >
                    {isLipSyncEnabled ? '🔊 ON' : '🔇 OFF'}
                </button>
            </div>
            <div className="control-group" />

            <h3>✨ 自動表情</h3>
            <div className="control-group">
                <button
                    className={`control-button toggle ${isAutoExpression ? 'active' : ''}`}
                    onClick={onAutoExpressionToggle}
                >
                    {isAutoExpression ? '🔄 ON' : '⏸️ OFF'}
                </button>
            </div>
            <div className="control-group" style={{ opacity: isAutoExpression ? 1 : 0.3 }}>
                <div className="slider-group compact">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{expressionInterval}秒</span>
                    <input
                        type="range"
                        className="control-slider"
                        min="2"
                        max="15"
                        value={expressionInterval}
                        onChange={(e) => onExpressionIntervalChange(Number(e.target.value))}
                        disabled={!isAutoExpression}
                    />
                </div>
            </div>

            <h3>🖼️ 背景</h3>
            <div className="control-group">
                <button className="control-button" onClick={handleBackgroundSelect}>
                    {backgroundImage ? '🔄 画像' : '📁 画像'}
                </button>
            </div>
            <div className="control-group">
                <button
                    className={`control-button ${isGreenScreen ? 'active' : ''}`}
                    onClick={onGreenScreenToggle}
                >
                    🟢 GB
                </button>
            </div>

            <h3>💃 アニメーション</h3>
            <div className="control-group">
                <button className="control-button" onClick={handleAnimationSelect} disabled={!hasVrm}>
                    {animationUrl ? '🔄 アニメ' : '📁 .vrma'}
                </button>
            </div>
            <div className="control-group" />

            <h3>📐 出力 / 🎙️ マイク</h3>
            <div className="control-group">
                <select
                    className="control-select"
                    value={outputSize}
                    onChange={(e) => onOutputSizeChange(e.target.value as OutputSize)}
                    disabled={isVirtualCameraOn}
                >
                    {OUTPUT_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                            {size.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="control-group">
                <select
                    className="control-select"
                    value={selectedDeviceId}
                    onChange={(e) => onDeviceChange(e.target.value)}
                >
                    {audioDevices.length === 0 ? (
                        <option value="">マイクなし</option>
                    ) : (
                        audioDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label.slice(0, 20)}...
                            </option>
                        ))
                    )}
                </select>
            </div>

            <h3>☀️ 明るさ</h3>
            <div className="control-group slider-group">
                <input
                    type="range"
                    className="control-slider"
                    min="-100"
                    max="100"
                    value={colorAdjustment.brightness}
                    onChange={(e) => onColorAdjustmentChange({
                        ...colorAdjustment,
                        brightness: parseInt(e.target.value)
                    })}
                />
            </div>

            {/* 仮想カメラ（2列分で大きく） */}
            <div className="virtual-camera-section">
                <button
                    className={`control-button virtual-camera-large ${isVirtualCameraOn ? 'active' : ''}`}
                    onClick={onVirtualCameraToggle}
                    disabled={isVirtualCameraConnecting || !hasVrm}
                    title="OBS Virtual Cameraを使用して配信ソフトに映像を送信します"
                >
                    {isVirtualCameraConnecting
                        ? '⏳ 接続中...'
                        : isVirtualCameraOn
                            ? '🔴 配信停止'
                            : '🎥 配信開始'}
                </button>
            </div>

        </div>
    )
}
