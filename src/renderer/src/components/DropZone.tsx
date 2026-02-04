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

    const handleClick = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.vrm'
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                const file = files[0]
                const filePath = (file as File & { path?: string }).path || null
                onFileDrop(file, filePath)
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

