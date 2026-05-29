import React, { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PhotoItem } from '../types'

interface Props {
  photos: PhotoItem[]
  onPhotosChange: (photos: PhotoItem[]) => void
}

const CROP_W = 270
const CROP_H = 480

// ───── 位置調整モーダル ─────────────────────────────────────────────
function CropAdjuster({ photo, onUpdate, onClose }: {
  photo: PhotoItem
  onUpdate: (p: PhotoItem) => void
  onClose: () => void
}) {
  const [cropX, setCropX] = useState(photo.cropX)
  const [cropY, setCropY] = useState(photo.cropY)
  const [overflow, setOverflow] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const { naturalWidth: iw, naturalHeight: ih } = img
    const scale = Math.max(CROP_W / iw, CROP_H / ih)
    setOverflow({
      x: Math.max(0, iw * scale - CROP_W),
      y: Math.max(0, ih * scale - CROP_H),
    })
  }

  const move = (dx: number, dy: number) => {
    if (overflow.x > 0) setCropX(p => Math.max(-0.5, Math.min(0.5, p - dx / overflow.x)))
    if (overflow.y > 0) setCropY(p => Math.max(-0.5, Math.min(0.5, p - dy / overflow.y)))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    move(e.clientX - dragRef.current.lastX, e.clientY - dragRef.current.lastY)
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY
  }
  const onMouseUp = () => { dragRef.current.active = false }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    dragRef.current = { active: true, lastX: t.clientX, lastY: t.clientY }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.active) return
    const t = e.touches[0]
    move(t.clientX - dragRef.current.lastX, t.clientY - dragRef.current.lastY)
    dragRef.current.lastX = t.clientX
    dragRef.current.lastY = t.clientY
  }

  const posX = (0.5 + cropX) * 100
  const posY = (0.5 + cropY) * 100
  const canAdjust = overflow.x > 0 || overflow.y > 0

  return (
    <div className="crop-overlay" onClick={onClose}>
      <div className="crop-modal" onClick={e => e.stopPropagation()}>
        <div className="crop-header">
          <span className="crop-title">位置調整</span>
          <button className="crop-close" onClick={onClose}>✕</button>
        </div>

        <div
          className="crop-preview"
          style={{ width: CROP_W, height: CROP_H, cursor: canAdjust ? 'grab' : 'default' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
        >
          <img
            src={photo.previewUrl}
            alt=""
            onLoad={handleLoad}
            draggable={false}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: `${posX}% ${posY}%`,
              userSelect: 'none', pointerEvents: 'none',
            }}
          />
        </div>

        <p className="crop-hint">
          {canAdjust ? 'ドラッグで表示位置を調整できます' : 'この写真は縦型なので調整不要です'}
        </p>

        <div className="crop-btns">
          <button
            className="crop-reset-btn"
            onClick={() => { setCropX(0); setCropY(0) }}
            disabled={!canAdjust}
          >
            中央にリセット
          </button>
          <button
            className="crop-confirm-btn"
            onClick={() => { onUpdate({ ...photo, cropX, cropY }); onClose() }}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── ソータブル写真カード ──────────────────────────────────────────
function SortablePhoto({ photo, onRemove, onDurationChange, onCropAdjust }: {
  photo: PhotoItem
  onRemove: (id: string) => void
  onDurationChange: (id: string, duration: number) => void
  onCropAdjust: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const posX = (0.5 + photo.cropX) * 100
  const posY = (0.5 + photo.cropY) * 100

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="photo-card"
    >
      <div className="photo-drag-handle" {...attributes} {...listeners}>
        <div className="photo-thumb-wrap">
          <img
            src={photo.previewUrl}
            alt=""
            className="photo-thumb"
            style={{ objectFit: 'cover', objectPosition: `${posX}% ${posY}%` }}
          />
          <div className="photo-drag-icon">⠿</div>
        </div>
      </div>
      <div className="photo-card-footer">
        <input
          type="number" min={1} max={10} step={0.5}
          value={photo.duration}
          onChange={e => onDurationChange(photo.id, Number(e.target.value))}
          className="duration-input"
        />
        <span className="duration-label">秒</span>
        <button
          className="crop-icon-btn"
          onClick={e => { e.stopPropagation(); onCropAdjust(photo.id) }}
          title="位置調整"
        >
          ✂
        </button>
        <button className="remove-btn" onClick={() => onRemove(photo.id)}>✕</button>
      </div>
    </div>
  )
}

// ───── メインコンポーネント ──────────────────────────────────────────
export default function Step1Upload({ photos, onPhotosChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos: PhotoItem[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      duration: 3,
      texts: [],
      cropX: 0,
      cropY: 0,
    }))
    onPhotosChange([...photos, ...newPhotos].slice(0, 20))
  }, [photos, onPhotosChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxFiles: 20,
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = photos.findIndex(p => p.id === active.id)
      const newIdx = photos.findIndex(p => p.id === over.id)
      onPhotosChange(arrayMove(photos, oldIdx, newIdx))
    }
  }

  const handleUpdate = (updated: PhotoItem) => {
    onPhotosChange(photos.map(p => p.id === updated.id ? updated : p))
  }

  const adjustingPhoto = adjustingId ? photos.find(p => p.id === adjustingId) ?? null : null

  return (
    <div className="step-content">
      <div className="step-header">
        <h2 className="step-title">写真を選ぶ</h2>
        <p className="step-desc">最大20枚まで。ドラッグで順序変更、✂ で表示位置を調整できます。</p>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <div className="dropzone-inner">
          <div className="dropzone-icon">🖼</div>
          <p className="dropzone-text">
            {isDragActive ? 'ここにドロップ' : 'クリックまたはドラッグで写真を追加'}
          </p>
          <p className="dropzone-hint">JPEG・PNG対応 / 1枚10MBまで</p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="photos-section">
          <div className="photos-count">{photos.length}枚選択中</div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map(p => p.id)} strategy={horizontalListSortingStrategy}>
              <div className="photos-grid">
                {photos.map(photo => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    onRemove={id => onPhotosChange(photos.filter(p => p.id !== id))}
                    onDurationChange={(id, dur) => onPhotosChange(photos.map(p => p.id === id ? { ...p, duration: dur } : p))}
                    onCropAdjust={setAdjustingId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {adjustingPhoto && (
        <CropAdjuster
          photo={adjustingPhoto}
          onUpdate={handleUpdate}
          onClose={() => setAdjustingId(null)}
        />
      )}
    </div>
  )
}
