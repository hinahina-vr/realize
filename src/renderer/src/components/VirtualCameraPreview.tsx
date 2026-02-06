import { useState, useEffect, useRef, useCallback } from 'react'
import type { Translations } from '../i18n'

interface VirtualCameraPreviewProps {
    isVirtualCameraOn: boolean
    t: Translations
}

export function VirtualCameraPreview({ isVirtualCameraOn, t }: VirtualCameraPreviewProps): JSX.Element | null {
    const [isPreviewOn, setIsPreviewOn] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameraName, setCameraName] = useState<string>('')
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const pendingStreamRef = useRef<MediaStream | null>(null)

    // ストリームをvideo要素に設定
    useEffect(() => {
        if (isPreviewOn && pendingStreamRef.current && videoRef.current) {
            videoRef.current.srcObject = pendingStreamRef.current
            streamRef.current = pendingStreamRef.current
            pendingStreamRef.current = null

            videoRef.current.play().catch(e => {
                console.error('Video play failed:', e)
            })
        }
    }, [isPreviewOn])

    // プレビュー停止
    const stopPreview = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        if (pendingStreamRef.current) {
            pendingStreamRef.current.getTracks().forEach(track => track.stop())
            pendingStreamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsPreviewOn(false)
        setError(null)
    }, [])

    // プレビュー開始
    const startPreview = useCallback(async () => {
        try {
            // まず任意のカメラにアクセスしてパーミッションを得る
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
                tempStream.getTracks().forEach(t => t.stop())
            } catch (e) {
                console.log('Permission request failed:', e)
            }

            // デバイス列挙
            const allDevices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = allDevices.filter(d => d.kind === 'videoinput')

            // Hinahina Virtual Cameraを優先して探す
            let targetCamera = videoDevices.find(d => d.label.includes('Hinahina'))
            if (!targetCamera) {
                targetCamera = videoDevices.find(d =>
                    d.label.includes('Virtual Camera') && !d.label.includes('OBS')
                )
            }

            if (!targetCamera) {
                setError(t.virtualCamera.previewNotFound)
                return
            }

            setCameraName(targetCamera.label)

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: targetCamera.deviceId } }
            })

            // ストリームを保存してから、モーダルを表示
            pendingStreamRef.current = stream
            setIsPreviewOn(true)
            setError(null)
        } catch (e) {
            console.error('Failed to open virtual camera:', e)
            setError(t.virtualCamera.previewNotFound)
        }
    }, [t])

    // 仮想カメラがOFFになったらプレビューも停止
    useEffect(() => {
        if (!isVirtualCameraOn && isPreviewOn) {
            stopPreview()
        }
    }, [isVirtualCameraOn, isPreviewOn, stopPreview])

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
            if (pendingStreamRef.current) {
                pendingStreamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    if (!isVirtualCameraOn) {
        return null
    }

    return (
        <>
            {/* トリガーボタン */}
            <div className="vcam-preview-trigger">
                <span>{t.virtualCamera.preview}</span>
                <button
                    className="vcam-preview-toggle"
                    onClick={startPreview}
                >
                    {t.virtualCamera.previewCheck}
                </button>
            </div>
            {error && <div className="vcam-preview-error">{error}</div>}

            {/* モーダル - どこをクリックしても閉じる */}
            {isPreviewOn && (
                <div className="vcam-modal-overlay" onClick={stopPreview}>
                    <div className="vcam-modal-content">
                        <div className="vcam-modal-header">
                            <span>📹 {cameraName}</span>
                            <button className="vcam-modal-close" onClick={stopPreview}>
                                ✕
                            </button>
                        </div>
                        <video
                            ref={videoRef}
                            className="vcam-modal-video"
                            autoPlay
                            playsInline
                            muted
                        />
                        <div className="vcam-modal-footer">
                            {t.virtualCamera.previewClose}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
