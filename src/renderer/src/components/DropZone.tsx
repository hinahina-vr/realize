import { useCallback } from 'react'

interface DropZoneProps {
    onFileDrop: (file: File) => void
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
                    onFileDrop(file)
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

    const handleClick = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.vrm'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                onFileDrop(files[0])
            }
        }
        input.click()
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

