import { useCallback } from 'react'
import type { OutputSize } from '../App'

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
    outputSize: OutputSize
    onOutputSizeChange: (size: OutputSize) => void
    isVirtualCameraOn: boolean
    isVirtualCameraConnecting: boolean
    onVirtualCameraToggle: () => void
    onClearVrm: () => void
    hasVrm: boolean
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
    outputSize,
    onOutputSizeChange,
    isVirtualCameraOn,
    isVirtualCameraConnecting,
    onVirtualCameraToggle,
    onClearVrm,
    hasVrm
}: ControlsProps): JSX.Element {
    const handleBackgroundSelect = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                onBackgroundChange(files[0])
            }
        }
        input.click()
    }, [onBackgroundChange])

    return (
        <div className="controls">
            {/* 仮想カメラ（最上部に配置） */}
            <h3>🎥 仮想カメラ</h3>
            <div className="control-group">
                <button
                    className={`control-button virtual-camera ${isVirtualCameraOn ? 'active' : ''}`}
                    onClick={onVirtualCameraToggle}
                    disabled={isVirtualCameraConnecting || !hasVrm}
                >
                    {isVirtualCameraConnecting
                        ? '⏳ 接続中...'
                        : isVirtualCameraOn
                            ? '🟢 配信中 - 停止'
                            : '▶️ 配信開始'}
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

            <h3>🎙️ マイク選択</h3>
            <div className="control-group">
                <select
                    className="control-select"
                    value={selectedDeviceId}
                    onChange={(e) => onDeviceChange(e.target.value)}
                >
                    {audioDevices.length === 0 ? (
                        <option value="">マイクが見つかりません</option>
                    ) : (
                        audioDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <h3>🖼️ 背景画像</h3>
            <div className="control-group">
                <button className="control-button" onClick={handleBackgroundSelect}>
                    {backgroundImage ? '🔄 変更' : '📁 画像を選択'}
                </button>
                {backgroundImage && (
                    <button className="control-button secondary" onClick={() => onBackgroundChange(null)}>
                        🗑️ 背景を削除
                    </button>
                )}
            </div>

            <h3>📐 出力サイズ</h3>
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

            {hasVrm && (
                <>
                    <h3>⚙️ その他</h3>
                    <div className="control-group">
                        <button className="control-button danger" onClick={onClearVrm}>
                            VRMをクリア
                        </button>
                    </div>
                </>
            )}

            <div className="status-bar">
                <p>
                    🎥 仮想カメラ:{' '}
                    <span className={isVirtualCameraOn ? 'status-online' : 'status-offline'}>
                        {isVirtualCameraOn ? '配信中' : '停止'}
                    </span>
                </p>
                <p>
                    🎤 マイク:{' '}
                    <span className={isLipSyncEnabled ? 'status-online' : 'status-offline'}>
                        {isLipSyncEnabled ? '接続中' : '未接続'}
                    </span>
                </p>
            </div>
        </div>
    )
}
