import { useCallback } from 'react'

interface DropZoneProps {
    onFileDrop: (file: File, filePath: string | null) => void
    lastVrmPath?: string | null
    onLoadLastVrm?: () => void
}

export function DropZone({ onFileDrop, lastVrmPath, onLoadLastVrm }: DropZoneProps): JSX.Element {
    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            e.stopPropagation()

            const files = e.dataTransfer.files
            if (files.length > 0) {
                const file = files[0]
                if (file.name.endsWith('.vrm')) {
                    // Electronでは File オブジェクトに path プロパティがある
                    const filePath = (file as File & { path?: string }).path || null
                    onFileDrop(file, filePath)
                } else {
                    alert('VRMファイルをドロップしてください')
                }
            }
        },
        [onFileDrop]
    )

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleClick = useCallback(async () => {
        // Electronのダイアログを使用してパスを確実に取得
        const filePath = await window.api.dialog.openVrm()
        if (filePath) {
            // ファイルをバッファとして読み込み
            const buffer = await window.api.file.readAsBuffer(filePath)
            if (buffer) {
                const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/octet-stream' })
                const file = new File([blob], filePath.split(/[/\\]/).pop() || 'model.vrm', { type: 'application/octet-stream' })
                onFileDrop(file, filePath)
            }
        }
    }, [onFileDrop])

    // ファイル名だけを取得
    const lastVrmName = lastVrmPath ? lastVrmPath.split(/[/\\]/).pop() : null

    return (
        <div className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver} onClick={handleClick}>
            <div className="drop-zone-content">
                <div className="drop-zone-icon">📁</div>
                <h2>VRMファイルをドロップ</h2>
                <p>または、クリックしてファイルを選択</p>
                {lastVrmPath && onLoadLastVrm && (
                    <button
                        className="load-last-vrm-btn"
                        onClick={(e) => {
                            e.stopPropagation()
                            onLoadLastVrm()
                        }}
                    >
                        📂 前回のVRM: {lastVrmName}
                    </button>
                )}
            </div>
        </div>
    )
}

