import { useState, useRef, useCallback } from 'react'
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
    intervalProgress: number
    onPlayAnimation: (id: string) => void
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
    onPlayAnimation,
    t
}: AnimationPlaylistProps): JSX.Element {

    const [movingItem, setMovingItem] = useState<{ id: string; direction: 'to-stock' | 'to-queue' } | null>(null)
    const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const getItemById = (id: string): AnimationItem | undefined => {
        return ANIMATION_ITEMS.find(item => item.id === id)
    }

    // Queue→Stock移動（クリック）
    const handleQueueClick = useCallback((id: string, index: number) => {
        setMovingItem({ id, direction: 'to-stock' })
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
        moveTimeoutRef.current = setTimeout(() => {
            onQueueChange(queue.filter((_, i) => i !== index))
            onStockChange([...stock, id])
            setMovingItem(null)
        }, 250)
    }, [queue, stock, onQueueChange, onStockChange])

    // Stock→Queue移動（クリック）
    const handleStockClick = useCallback((id: string, index: number) => {
        setMovingItem({ id, direction: 'to-queue' })
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
        moveTimeoutRef.current = setTimeout(() => {
            onStockChange(stock.filter((_, i) => i !== index))
            onQueueChange([...queue, id])
            setMovingItem(null)
        }, 250)
    }, [queue, stock, onQueueChange, onStockChange, onPlayAnimation])

    return (
        <div className="expression-playlist">
            <div className="expression-lane expression-queue"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault()
                    const fromLane = e.dataTransfer.getData('anim-lane')
                    const fromIndex = Number(e.dataTransfer.getData('anim-index'))
                    if (fromLane === 'stock' && !isNaN(fromIndex)) {
                        const id = stock[fromIndex]
                        onStockChange(stock.filter((_, i) => i !== fromIndex))
                        onQueueChange([...queue, id])
                    }
                }}
            >
                {queue.map((id, index) => {
                    const item = getItemById(id)
                    if (!item) return null
                    const isPlaying = currentPlayingId === id
                    const currentIdx = queue.indexOf(currentPlayingId ?? '')
                    const isNext = isLooping && currentIdx >= 0 && queue[(currentIdx + 1) % queue.length] === id && !isPlaying
                    const isMoving = movingItem?.id === id && movingItem?.direction === 'to-stock'
                    return (
                        <button
                            key={`${item.id}-${index}`}
                            className={`expression-btn ${isPlaying ? 'active' : ''} ${isPlaying && isLooping ? 'countdown' : ''} ${isNext ? 'next' : ''} ${isMoving ? 'moving-out' : ''}`}
                            style={isPlaying && isLooping && intervalProgress > 0 ? { '--progress': `${intervalProgress}%` } as React.CSSProperties : {}}
                            onClick={() => handleQueueClick(id, index)}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('anim-lane', 'queue')
                                e.dataTransfer.setData('anim-index', String(index))
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const fromLane = e.dataTransfer.getData('anim-lane')
                                const fromIdx = Number(e.dataTransfer.getData('anim-index'))
                                if (isNaN(fromIdx)) return
                                if (fromLane === 'queue') {
                                    if (fromIdx === index) return
                                    const newQueue = [...queue]
                                    const [moved] = newQueue.splice(fromIdx, 1)
                                    newQueue.splice(index, 0, moved)
                                    onQueueChange(newQueue)
                                } else if (fromLane === 'stock') {
                                    const movedId = stock[fromIdx]
                                    onStockChange(stock.filter((_, i) => i !== fromIdx))
                                    const newQueue = [...queue]
                                    newQueue.splice(index, 0, movedId)
                                    onQueueChange(newQueue)
                                }
                            }}
                        >
                            <span className="emoji">{item.emoji}</span>
                            <span>{t.animation[item.label as keyof typeof t.animation] || item.label}</span>
                        </button>
                    )
                })}
                {queue.length === 0 && <div className="empty-hint">ドロップ</div>}
            </div>
            <div className="expression-divider" />
            <div className="expression-lane expression-stock"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault()
                    const fromLane = e.dataTransfer.getData('anim-lane')
                    const fromIdx = Number(e.dataTransfer.getData('anim-index'))
                    if (fromLane === 'queue' && !isNaN(fromIdx)) {
                        const id = queue[fromIdx]
                        onQueueChange(queue.filter((_, i) => i !== fromIdx))
                        onStockChange([...stock, id])
                    }
                }}
            >
                {stock.map((id, index) => {
                    const item = getItemById(id)
                    if (!item) return null
                    const isMoving = movingItem?.id === id && movingItem?.direction === 'to-queue'
                    return (
                        <button
                            key={`${item.id}-${index}`}
                            className={`expression-btn stock ${isMoving ? 'moving-in' : ''}`}
                            onClick={() => handleStockClick(id, index)}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('anim-lane', 'stock')
                                e.dataTransfer.setData('anim-index', String(index))
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const fromLane = e.dataTransfer.getData('anim-lane')
                                const fromIdx = Number(e.dataTransfer.getData('anim-index'))
                                if (isNaN(fromIdx)) return
                                if (fromLane === 'stock') {
                                    if (fromIdx === index) return
                                    const newStock = [...stock]
                                    const [moved] = newStock.splice(fromIdx, 1)
                                    newStock.splice(index, 0, moved)
                                    onStockChange(newStock)
                                } else if (fromLane === 'queue') {
                                    const movedId = queue[fromIdx]
                                    onQueueChange(queue.filter((_, i) => i !== fromIdx))
                                    const newStock = [...stock]
                                    newStock.splice(index, 0, movedId)
                                    onStockChange(newStock)
                                }
                            }}
                        >
                            <span className="emoji">{item.emoji}</span>
                            <span>{t.animation[item.label as keyof typeof t.animation] || item.label}</span>
                        </button>
                    )
                })}
                {stock.length === 0 && <div className="empty-hint">ストック</div>}
            </div>
            <div className="expression-loop-control">
                <button
                    className={`loop-toggle ${isLooping ? 'active' : ''}`}
                    onClick={onLoopToggle}
                    title={isLooping ? 'ループ停止' : 'ループ開始'}
                >
                    {isLooping ? '⏹️' : '▶️'}
                </button>
                <input
                    type="range"
                    min="0"
                    max="10"
                    value={intervalSecs}
                    onChange={(e) => onIntervalChange(Number(e.target.value))}
                    className="interval-slider"
                    title={`インターバル: ${intervalSecs}秒`}
                />
                <span className="interval-label">{intervalSecs}s</span>
            </div>
        </div>
    )
}
