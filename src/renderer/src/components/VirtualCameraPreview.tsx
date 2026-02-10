import { useState, useEffect, useRef, useCallback } from 'react'
import type { Translations } from '../i18n'

interface VirtualCameraPreviewProps {
    isVirtualCameraOn: boolean
    t: Translations
}

function rankDevice(label: string): number {
    const lower = label.toLowerCase()
    if (lower.includes('obs')) return 99
    if (
        lower.includes('hinahina') ||
        lower.includes('realize') ||
        lower.includes('virtual camera') ||
        lower.includes('\u4eee\u60f3\u30ab\u30e1\u30e9')
    ) {
        return 0
    }
    if (lower.includes('virtual') || lower.includes('camera')) return 1
    return 2
}

async function tryOpenDevice(
    devices: MediaDeviceInfo[]
): Promise<{ stream: MediaStream; label: string } | null> {
    const sorted = [...devices].sort((a, b) => rankDevice(a.label) - rankDevice(b.label))

    for (const device of sorted) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: device.deviceId } }
            })
            const trackLabel = stream.getVideoTracks()[0]?.label || ''

            if (trackLabel.toLowerCase().includes('obs')) {
                stream.getTracks().forEach((t) => t.stop())
                continue
            }

            const label = trackLabel || device.label || 'Virtual Camera'
            return { stream, label }
        } catch {
            // Try next candidate.
        }
    }

    return null
}

export function VirtualCameraPreview({ isVirtualCameraOn, t }: VirtualCameraPreviewProps): JSX.Element | null {
    const [isPreviewOn, setIsPreviewOn] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cameraName, setCameraName] = useState<string>('')
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const pendingStreamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        if (isPreviewOn && pendingStreamRef.current && videoRef.current) {
            videoRef.current.srcObject = pendingStreamRef.current
            streamRef.current = pendingStreamRef.current
            pendingStreamRef.current = null

            videoRef.current.play().catch((e) => {
                console.error('Video play failed:', e)
            })
        }
    }, [isPreviewOn])

    const stopPreview = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
        if (pendingStreamRef.current) {
            pendingStreamRef.current.getTracks().forEach((track) => track.stop())
            pendingStreamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsPreviewOn(false)
        setError(null)
    }, [])

    const startPreview = useCallback(async () => {
        try {
            // Ask media permission first so labels are populated if possible.
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
                tempStream.getTracks().forEach((t) => t.stop())
            } catch (e) {
                console.log('Permission request failed:', e)
            }

            const allDevices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = allDevices.filter((d) => d.kind === 'videoinput')

            if (videoDevices.length === 0) {
                setError(t.virtualCamera.previewNotFound)
                return
            }

            const result = await tryOpenDevice(videoDevices)
            if (!result) {
                console.warn('No previewable camera found', videoDevices.map((d) => d.label || d.deviceId))
                setError(t.virtualCamera.previewNotFound)
                return
            }

            setCameraName(result.label)
            pendingStreamRef.current = result.stream
            setIsPreviewOn(true)
            setError(null)
        } catch (e) {
            console.error('Failed to open virtual camera:', e)
            setError(t.virtualCamera.previewNotFound)
        }
    }, [t])

    useEffect(() => {
        if (!isVirtualCameraOn && isPreviewOn) {
            stopPreview()
        }
    }, [isVirtualCameraOn, isPreviewOn, stopPreview])

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
            if (pendingStreamRef.current) {
                pendingStreamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    if (!isVirtualCameraOn) {
        return null
    }

    return (
        <>
            <div className="vcam-preview-trigger">
                <span>{t.virtualCamera.preview}</span>
                <button className="vcam-preview-toggle" onClick={startPreview}>
                    {t.virtualCamera.previewCheck}
                </button>
            </div>
            {error && <div className="vcam-preview-error">{error}</div>}

            {isPreviewOn && (
                <div className="vcam-modal-overlay" onClick={stopPreview}>
                    <div className="vcam-modal-content">
                        <div className="vcam-modal-header">
                            <span>Camera: {cameraName}</span>
                            <button className="vcam-modal-close" onClick={stopPreview}>
                                X
                            </button>
                        </div>
                        <video ref={videoRef} className="vcam-modal-video" autoPlay playsInline muted />
                        <div className="vcam-modal-footer">{t.virtualCamera.previewClose}</div>
                    </div>
                </div>
            )}
        </>
    )
}
