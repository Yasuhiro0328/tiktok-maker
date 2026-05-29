import React, { useEffect, useRef, useState } from 'react'
import { PhotoItem, TextOverlay } from '../types'

interface Props {
  photos: PhotoItem[]
  onPhotosChange: (photos: PhotoItem[]) => void
}

const CANVAS_W = 270   // 表示用キャンバス幅 (1080/4)
const CANVAS_H = 480   // 表示用キャンバス高 (1920/4)

function TextEditor({ photo, onUpdate }: { photo: PhotoItem; onUpdate: (p: PhotoItem) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editColor, setEditColor] = useState('#FFFFFF')
  const [editSize, setEditSize] = useState(48)
  const [editBold, setEditBold] = useState(false)
  const [editShadow, setEditShadow] = useState(true)
  const [editBackground, setEditBackground] = useState(false)
  const [editBgOpacity, setEditBgOpacity] = useState(60)

  useEffect(() => {
    if (!canvasRef.current) return
    let isMounted = true

    import('fabric').then(({ fabric }) => {
      if (!isMounted || !canvasRef.current) return

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        selection: true,
      })
      fabricRef.current = canvas

      // 背景画像（cropX/cropYを考慮した位置で表示）
      fabric.Image.fromURL(photo.previewUrl, (img: any) => {
        if (!isMounted) return
        const cropX = photo.cropX ?? 0
        const cropY = photo.cropY ?? 0
        const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height)
        img.scale(scale)
        const ox = (img.width * scale - CANVAS_W) * (0.5 + cropX)
        const oy = (img.height * scale - CANVAS_H) * (0.5 + cropY)
        img.set({ left: -ox, top: -oy, originX: 'left', originY: 'top', selectable: false, evented: false })
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
        photo.texts.forEach(t => addFabricText(canvas, t, fabric))
      })

      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0]
        if (obj && obj.overlayId) {
          setSelectedId(obj.overlayId)
          setEditText(obj.text)
          setEditColor(obj.fill)
          setEditSize(Math.round(obj.fontSize * 4))
          setEditBold(obj.fontWeight === 'bold')
          setEditBackground(obj.overlayBackground || false)
          setEditBgOpacity(Math.round((obj.overlayBgOpacity || 0.6) * 100))
        }
      })
      canvas.on('selection:cleared', () => setSelectedId(null))

      canvas.on('object:modified', () => syncToPhoto(canvas, photo, onUpdate))
    })

    return () => {
      isMounted = false
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  }, [photo.id])

  function addFabricText(canvas: any, overlay: TextOverlay, fabric: any) {
    const hasBg = overlay.background || false
    const bgOpacity = overlay.bgOpacity ?? 0.6
    const text = new fabric.IText(overlay.text || 'テキスト', {
      left: overlay.x * CANVAS_W,
      top: overlay.y * CANVAS_H,
      fontSize: overlay.fontSize / 4,
      fill: overlay.color,
      fontFamily: 'sans-serif',
      fontWeight: overlay.bold ? 'bold' : 'normal',
      shadow: overlay.shadow && !hasBg ? new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 4, offsetX: 2, offsetY: 2 }) : null,
      backgroundColor: hasBg ? `rgba(0,0,0,${bgOpacity})` : '',
      originX: 'center',
      originY: 'center',
      overlayId: overlay.id,
      overlayBackground: hasBg,
      overlayBgOpacity: bgOpacity,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  function syncToPhoto(canvas: any, photo: PhotoItem, onUpdate: (p: PhotoItem) => void) {
    const objects = canvas.getObjects('i-text')
    const texts: TextOverlay[] = objects.map((obj: any) => ({
      id: obj.overlayId || crypto.randomUUID(),
      text: obj.text,
      x: obj.left / CANVAS_W,
      y: obj.top / CANVAS_H,
      fontSize: Math.round(obj.fontSize * 4),
      color: obj.fill,
      bold: obj.fontWeight === 'bold',
      shadow: !!obj.shadow,
      background: obj.overlayBackground || false,
      bgOpacity: obj.overlayBgOpacity ?? 0.6,
    }))
    onUpdate({ ...photo, texts })
  }

  const handleAddText = async () => {
    if (!fabricRef.current) return
    const { fabric } = await import('fabric')
    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: 'テキスト',
      x: 0.5, y: 0.5,
      fontSize: 48,
      color: '#FFFFFF',
      bold: false,
      shadow: true,
      background: false,
      bgOpacity: 0.6,
    }
    addFabricText(fabricRef.current, newOverlay, fabric)
    syncToPhoto(fabricRef.current, photo, onUpdate)
  }

  const handleDeleteSelected = () => {
    if (!fabricRef.current) return
    const active = fabricRef.current.getActiveObject()
    if (active) {
      fabricRef.current.remove(active)
      fabricRef.current.renderAll()
      syncToPhoto(fabricRef.current, photo, onUpdate)
      setSelectedId(null)
    }
  }

  const applyEdit = async () => {
    if (!fabricRef.current || !selectedId) return
    const { fabric } = await import('fabric')
    const obj = fabricRef.current.getObjects('i-text').find((o: any) => o.overlayId === selectedId)
    if (!obj) return
    const bgOpacityVal = editBgOpacity / 100
    obj.set({
      text: editText,
      fill: editColor,
      fontSize: editSize / 4,
      fontWeight: editBold ? 'bold' : 'normal',
      shadow: editShadow && !editBackground
        ? new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 4, offsetX: 2, offsetY: 2 })
        : null,
      backgroundColor: editBackground ? `rgba(0,0,0,${bgOpacityVal})` : '',
      overlayBackground: editBackground,
      overlayBgOpacity: bgOpacityVal,
    })
    fabricRef.current.renderAll()
    syncToPhoto(fabricRef.current, photo, onUpdate)
  }

  return (
    <div className="text-editor">
      <div className="canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-controls">
        <button className="btn-add-text" onClick={handleAddText}>＋ テキスト追加</button>

        {selectedId && (
          <div className="text-edit-panel">
            <div className="panel-title">テキスト編集</div>
            <input
              type="text"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="text-input-field"
              placeholder="テキストを入力"
            />
            <div className="control-row">
              <label>サイズ</label>
              <input type="range" min={20} max={120} value={editSize}
                onChange={e => setEditSize(Number(e.target.value))} />
              <span>{editSize}px</span>
            </div>
            <div className="control-row">
              <label>色</label>
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} />
            </div>
            <div className="control-row">
              <label>太字</label>
              <input type="checkbox" checked={editBold} onChange={e => setEditBold(e.target.checked)} />
              <label>影</label>
              <input type="checkbox" checked={editShadow} onChange={e => setEditShadow(e.target.checked)} disabled={editBackground} />
            </div>
            <div className="control-row">
              <label>背景</label>
              <input type="checkbox" checked={editBackground} onChange={e => setEditBackground(e.target.checked)} />
            </div>
            {editBackground && (
              <div className="control-row">
                <label>不透明度</label>
                <input type="range" min={20} max={90} step={10} value={editBgOpacity}
                  onChange={e => setEditBgOpacity(Number(e.target.value))} />
                <span>{editBgOpacity}%</span>
              </div>
            )}
            <div className="control-row">
              <button className="btn-apply" onClick={applyEdit}>適用</button>
              <button className="btn-delete" onClick={handleDeleteSelected}>削除</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Step2Text({ photos, onPhotosChange }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)

  const handleUpdate = (updated: PhotoItem) => {
    onPhotosChange(photos.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2 className="step-title">テキストを追加</h2>
        <p className="step-desc">写真をクリックして選択し、テキストを追加・編集してください。</p>
      </div>

      <div className="photo-tabs">
        {photos.map((p, i) => (
          <button
            key={p.id}
            className={`photo-tab ${i === activeIdx ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            <img src={p.previewUrl} alt="" className="tab-thumb" />
            <span>{i + 1}</span>
          </button>
        ))}
      </div>

      {photos[activeIdx] && (
        <TextEditor
          key={photos[activeIdx].id}
          photo={photos[activeIdx]}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
