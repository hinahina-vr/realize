import { useState, useCallback, useRef } from 'react'
import type { Translations } from '../i18n'

interface AnimationItem {
    id: string
    emoji: string
    label: string
}

interface AnimationPlaylistProps {
    queue: string[]
    stock: string[]
    onQueueChange: (queue: string[]) => void
    onStockChange: (stock: string[]) => void
    currentPlayingId: string | null
    isLooping: boolean
    onLoopToggle: () => void
    intervalSecs: number
    onIntervalChange: (secs: number) => void
    intervalProgress: number // 0-100% カウントダウン
    t: Translations
}

const ANIMATION_ITEMS: AnimationItem[] = [
    { id: 'fullbody', emoji: '💃', label: 'fullbody' },
    { id: 'greeting', emoji: '👋', label: 'greeting' },
    { id: 'vsign', emoji: '✌️', label: 'vsign' },
    { id: 'shoot', emoji: '🔫', label: 'shoot' },
    { id: 'spin', emoji: '🔄', label: 'spin' },
    { id: 'pose', emoji: '🧍', label: 'pose' },
    { id: 'squat', emoji: '🏋️', label: 'squat' }
]

export function AnimationPlaylist({
    queue,
    stock,
    onQueueChange,
    onStockChange,
    currentPlayingId,
    isLooping,
    onLoopToggle,
    intervalSecs,
    onIntervalChange,
    intervalProgress,
    t
}: AnimationPlaylistProps): JSX.Element {
    const [draggedItem, setDraggedItem] = useState<{ id: string; fromLane: 'queue' | 'stock' } | null>(null)
    const [dragOverLane, setDragOverLane] = useState<'queue' | 'stock' | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const dragCounterRef = useRef(0)

    const getItemById = (id: string): AnimationItem | undefined => {
        return ANIMATION_ITEMS.find(item => item.id === id)
    }

    const handleDragStart = useCallback((e: React.DragEvent, id: string, fromLane: 'queue' | 'stock') => {
        setDraggedItem({ id, fromLane })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
        // ドラッグ中のスタイル
        const target = e.target as HTMLElement
        setTimeout(() => target.classList.add('dragging'), 0)
    }, [])

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        const target = e.target as HTMLElement
        target.classList.remove('dragging')
        setDraggedItem(null)
        setDragOverLane(null)
        setDragOverIndex(null)
        dragCounterRef.current = 0
    }, [])

    const handleDragEnterLane = useCallback((lane: 'queue' | 'stock') => {
        dragCounterRef.current++
        setDragOverLane(lane)
    }, [])

    const handleDragLeaveLane = useCallback(() => {
        dragCounterRef.current--
        if (dragCounterRef.current === 0) {
            setDragOverLane(null)
            setDragOverIndex(null)
        }
    }, [])

    const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent, toLane: 'queue' | 'stock', toIndex?: number) => {
        e.preventDefault()
        if (!draggedItem) return

        const { id, fromLane } = draggedItem

        // 同じレーン内での移動
        if (fromLane === toLane) {
            const items = fromLane === 'queue' ? [...queue] : [...stock]
            const fromIndex = items.indexOf(id)
            if (fromIndex === -1) return

            items.splice(fromIndex, 1)
            const insertIndex = toIndex !== undefined ?
                (fromIndex < toIndex ? toIndex - 1 : toIndex) :
                items.length
            items.splice(insertIndex, 0, id)

            if (fromLane === 'queue') {
                onQueueChange(items)
            } else {
                onStockChange(items)
            }
        } else {
            // 異なるレーン間での移動
            const sourceItems = fromLane === 'queue' ? [...queue] : [...stock]
            const targetItems = toLane === 'queue' ? [...queue] : [...stock]

            const fromIndex = sourceItems.indexOf(id)
            if (fromIndex === -1) return

            sourceItems.splice(fromIndex, 1)
            const insertIndex = toIndex !== undefined ? toIndex : targetItems.length
            targetItems.splice(insertIndex, 0, id)

            if (fromLane === 'queue') {
                onQueueChange(sourceItems)
                onStockChange(targetItems)
            } else {
                onStockChange(sourceItems)
                onQueueChange(targetItems)
            }
        }

        setDraggedItem(null)
        setDragOverLane(null)
        setDragOverIndex(null)
    }, [draggedItem, queue, stock, onQueueChange, onStockChange])

    const renderItem = (id: string, lane: 'queue' | 'stock', index: number) => {
        const item = getItemById(id)
        if (!item) return null

        const isPlaying = currentPlayingId === id
        const isDragging = draggedItem?.id === id
        const isDropTarget = dragOverLane === lane && dragOverIndex === index

        return (
            <div
                key={id}
                className={`animation-playlist-item ${isPlaying ? 'playing' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, id, lane)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverItem(e, index)}
            >
                <span className="emoji">{item.emoji}</span>
                <span className="label">{t.animation[item.label as keyof typeof t.animation] || item.label}</span>
            </div>
        )
    }

    return (
        <div className="animation-playlist">
            <div
                className={`playlist-lane queue ${dragOverLane === 'queue' ? 'drag-over' : ''}`}
                onDragEnter={() => handleDragEnterLane('queue')}
                onDragLeave={handleDragLeaveLane}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'queue', dragOverIndex ?? undefined)}
            >

                <div className="lane-items">
                    {queue.map((id, index) => renderItem(id, 'queue', index))}
                    {queue.length === 0 && <div className="empty-hint">ドロップ</div>}
                </div>
                <div className={`interval-control ${intervalProgress > 0 ? 'counting' : ''}`}>
                    <button
                        className={`loop-toggle ${isLooping ? 'active' : ''}`}
                        onClick={onLoopToggle}
                        title={isLooping ? 'ループ停止' : 'ループ開始'}
                    >
                        {isLooping ? '⏹️' : '▶️'}
                    </button>
                    <div className="slider-wrapper">
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={intervalSecs}
                            onChange={(e) => onIntervalChange(Number(e.target.value))}
                            className="interval-slider"
                            title={`インターバル: ${intervalSecs}秒`}
                        />
                        {intervalProgress > 0 && (
                            <div
                                className="interval-progress-bar"
                                style={{ width: `${intervalProgress}%` }}
                            />
                        )}
                    </div>
                    <span className="interval-label">{intervalSecs}s</span>
                </div>
            </div>

            <div
                className={`playlist-lane stock ${dragOverLane === 'stock' ? 'drag-over' : ''}`}
                onDragEnter={() => handleDragEnterLane('stock')}
                onDragLeave={handleDragLeaveLane}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'stock', dragOverIndex ?? undefined)}
            >

                <div className="lane-items">
                    {stock.map((id, index) => renderItem(id, 'stock', index))}
                    {stock.length === 0 && <div className="empty-hint">-</div>}
                </div>
            </div>
        </div>
    )
}
