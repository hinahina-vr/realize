import { useCallback } from 'react'
import type { OutputSize, ColorAdjustment, ExpressionType } from '../App'
import type { Translations } from '../i18n'

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
    onBackgroundChange: (file: File | null, filePath?: string | null) => void
    backgroundVideo: string | null
    onBackgroundVideoChange: (file: File | null) => void
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
    onSaveCameraPosition?: () => void
    hasCustomCameraPosition?: boolean
    onResetCameraPosition?: () => void
    t: Translations
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
    backgroundVideo,
    onBackgroundVideoChange,
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
    onExpressionIntervalChange,
    onSaveCameraPosition,
    hasCustomCameraPosition,
    onResetCameraPosition,
    t
}: ControlsProps): JSX.Element {
    const handleBackgroundSelect = useCallback(async () => {
        // Electronのダイアログを使用してパスを確実に取得
        const filePath = await window.api.dialog.openImage()
        if (filePath) {
            // ファイルをバッファとして読み込み
            const buffer = await window.api.file.readAsBuffer(filePath)
            if (buffer) {
                const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'image/*' })
                const file = new File([blob], filePath.split(/[/\\]/).pop() || 'background.png', { type: 'image/*' })
                onBackgroundChange(file, filePath)
                // 画像選択時はグリーンバックをOFFに、動画もクリア
                if (isGreenScreen) {
                    onGreenScreenToggle()
                }
                onBackgroundVideoChange(null)
            }
        }
    }, [onBackgroundChange, onBackgroundVideoChange, isGreenScreen, onGreenScreenToggle])

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

    const handleVideoSelect = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'video/mp4,video/webm,video/ogg'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                onBackgroundVideoChange(files[0])
                // 動画選択時はグリーンバックをOFFに、画像もクリア
                if (isGreenScreen) {
                    onGreenScreenToggle()
                }
                onBackgroundChange(null)
            }
        }
        input.click()
    }, [onBackgroundVideoChange, onBackgroundChange, isGreenScreen, onGreenScreenToggle])

    return (
        <div className="controls">

            <h3>{t.vrmModel.title}</h3>
            <div className="control-group">
                <button className="control-button" onClick={onClearVrm}>
                    {t.vrmModel.replace}
                </button>
            </div>
            <div className="control-group">
                {hasVrm && (
                    <button
                        className="control-button"
                        onClick={onClearVrm}
                        title={t.tooltips.hideVrm}
                    >
                        ⏹️ OFF
                    </button>
                )}
            </div>

            <h3>{t.camera.title}</h3>
            <div className="control-group">
                <button
                    className={`control-button ${cameraPreset === 'bust' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('bust')}
                >
                    {t.camera.bust}
                </button>
                <button
                    className={`control-button ${cameraPreset === 'full' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('full')}
                >
                    {t.camera.full}
                </button>
                <button
                    className={`control-button ${cameraPreset === 'face' ? 'active' : ''}`}
                    onClick={() => onCameraPresetChange('face')}
                >
                    {t.camera.face}
                </button>
            </div>
            <div className="control-group camera-memory-group">
                {onSaveCameraPosition && (
                    <button
                        className="control-button save-camera-btn"
                        onClick={onSaveCameraPosition}
                    >
                        {t.camera.save}
                    </button>
                )}
                {hasCustomCameraPosition && onResetCameraPosition && (
                    <button
                        className="control-button reset-camera-btn"
                        onClick={onResetCameraPosition}
                    >
                        {t.camera.reset}
                    </button>
                )}
            </div>

            <h3>{t.lipSync.title}</h3>
            <div className="control-group">
                <button
                    className={`control-button toggle ${isLipSyncEnabled ? 'active' : ''}`}
                    onClick={onLipSyncToggle}
                >
                    {isLipSyncEnabled ? `🔊 ${t.lipSync.on}` : `🔇 ${t.lipSync.off}`}
                </button>
            </div>
            <div className="control-group" />

            <h3>{t.autoExpression.title}</h3>
            <div className="control-group">
                <button
                    className={`control-button toggle ${isAutoExpression ? 'active' : ''}`}
                    onClick={onAutoExpressionToggle}
                >
                    {isAutoExpression ? `🔄 ${t.autoExpression.on}` : `⏸️ ${t.autoExpression.off}`}
                </button>
            </div>
            <div className="control-group" style={{ opacity: isAutoExpression ? 1 : 0.3 }}>
                <div className="slider-group compact">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{expressionInterval}s</span>
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

            <h3>{t.background.title}</h3>
            <div className="control-group">
                <button className={`control-button ${backgroundImage ? 'active' : ''}`} onClick={handleBackgroundSelect}>
                    📁 {t.background.image}
                </button>
            </div>
            <div className="control-group">
                <button className={`control-button ${backgroundVideo ? 'active' : ''}`} onClick={handleVideoSelect}>
                    🎬 {t.background.video}
                </button>
            </div>
            <div className="control-group">
                <button
                    className={`control-button ${isGreenScreen ? 'active' : ''}`}
                    onClick={() => {
                        onGreenScreenToggle()
                        // GBをONにする時は動画と画像をクリア
                        if (!isGreenScreen) {
                            onBackgroundVideoChange(null)
                            onBackgroundChange(null)
                        }
                    }}
                >
                    🟢 {t.background.greenScreen}
                </button>
            </div>
            <div className="control-group">
                {(backgroundImage || backgroundVideo) && (
                    <button
                        className="control-button"
                        onClick={() => {
                            onBackgroundChange(null)
                            onBackgroundVideoChange(null)
                        }}
                        title={t.tooltips.clearBackground}
                    >
                        ⏹️ OFF
                    </button>
                )}
            </div>

            <h3>{t.animation.title}</h3>
            <div className="control-group">
                <button className={`control-button ${animationUrl ? 'active' : ''}`} onClick={handleAnimationSelect} disabled={!hasVrm}>
                    📁 {t.animation.file}
                </button>
            </div>
            <div className="control-group">
                {animationUrl && (
                    <button
                        className="control-button"
                        onClick={() => onAnimationChange(null)}
                        title={t.tooltips.stopAnimation}
                    >
                        ⏹️ OFF
                    </button>
                )}
            </div>
            <div className="control-group" />

            <h3>{t.outputMic.title}</h3>
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
                        <option value="">{t.outputMic.noMic}</option>
                    ) : (
                        audioDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label.slice(0, 20)}...
                            </option>
                        ))
                    )}
                </select>
            </div>

            <h3>☀️ {t.colorAdjustment.brightness}</h3>
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
                    title={t.tooltips.virtualCameraHelp}
                >
                    {isVirtualCameraConnecting
                        ? `⏳ ${t.virtualCamera.connecting}`
                        : isVirtualCameraOn
                            ? t.virtualCamera.stop
                            : t.virtualCamera.start}
                </button>
            </div>

        </div>
    )
}
