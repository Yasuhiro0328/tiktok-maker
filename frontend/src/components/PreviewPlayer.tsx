import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PhotoItem } from '../types'

const PREVIEW_W = 270
const PREVIEW_H = 480
const SCALE = PREVIEW_W / 1080

interface Props {
  photos: PhotoItem[]
  onClose: () => void
}

export default function PreviewPlayer({ photos, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  const rafRef = useRef<number | null>(null)

  const totalDuration = photos.reduce((s, p) => s + p.duration, 0)

  // アニメーションループ用のミュータブル状態（stale closure 回避）
  const playRef = useRef({
    active: false,
    idx: 0,
    slideStart: 0,
    pausedElapsed: 0,
    photos,
    totalDuration,
  })
  playRef.current.photos = photos
  playRef.current.totalDuration = totalDuration

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const tick = useCallback(() => {
    const r = playRef.current
    if (!r.active) return

    const now = performance.now()
    const elapsed = (now - r.slideStart) / 1000
    const slideDur = r.photos[r.idx].duration

    if (elapsed >= slideDur) {
      const next = r.idx + 1
      if (next < r.photos.length) {
        r.idx = next
        r.slideStart = now
        r.pausedElapsed = 0
        setCurrentIdx(next)
        const before = r.photos.slice(0, next).reduce((s, p) => s + p.duration, 0)
        setOverallProgress(before / r.totalDuration)
      } else {
        // 再生完了 → 先頭に戻す
        r.active = false
        r.idx = 0
        r.pausedElapsed = 0
        setIsPlaying(false)
        setCurrentIdx(0)
        setOverallProgress(1)
        return
      }
    } else {
      const before = r.photos.slice(0, r.idx).reduce((s, p) => s + p.duration, 0)
      setOverallProgress((before + elapsed) / r.totalDuration)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const handlePlay = () => {
    const r = playRef.current
    if (overallProgress >= 1) {
      r.idx = 0
      r.pausedElapsed = 0
      setCurrentIdx(0)
      setOverallProgress(0)
    }
    r.slideStart = performance.now() - r.pausedElapsed * 1000
    r.active = true
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }

  const handlePause = () => {
    const r = playRef.current
    r.pausedElapsed = (performance.now() - r.slideStart) / 1000
    r.active = false
    stopRaf()
    setIsPlaying(false)
  }

  const handleRestart = () => {
    const r = playRef.current
    r.active = false
    r.idx = 0
    r.pausedElapsed = 0
    stopRaf()
    setIsPlaying(false)
    setCurrentIdx(0)
    setOverallProgress(0)
  }

  // キーボードショートカット（isPlaying が変わるたびに最新の関数を捕捉）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') {
        e.preventDefault()
        isPlaying ? handlePause() : handlePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // stopRaf() をここに入れると isPlaying 変更のたびに RAF がキャンセルされるためNG
  }, [isPlaying, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  // アンマウント時のみ RAF をキャンセル
  useEffect(() => {
    return () => stopRaf()
  }, [])

  const currentPhoto = photos[currentIdx]
  const displayTime = Math.min(Math.round(overallProgress * totalDuration), totalDuration)

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">動画プレビュー</span>
          <button className="preview-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="preview-screen-wrap">
          <div className="preview-screen" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
            <img
              src={currentPhoto.previewUrl}
              alt=""
              className="preview-bg"
              style={{
                objectPosition: `${(0.5 + (currentPhoto.cropX ?? 0)) * 100}% ${(0.5 + (currentPhoto.cropY ?? 0)) * 100}%`
              }}
            />
            {currentPhoto.texts.map(t => (
              <span
                key={t.id}
                className="preview-text"
                style={{
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  fontSize: `${t.fontSize * SCALE}px`,
                  fontFamily: 'Meiryo, "MS PGothic", "Noto Sans JP", sans-serif',
                  color: t.color,
                  fontWeight: t.bold ? 'bold' : 'normal',
                  textShadow: t.shadow && !t.background ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  background: t.background ? `rgba(0,0,0,${t.bgOpacity ?? 0.6})` : 'transparent',
                  padding: t.background ? '3px 10px' : '0',
                  borderRadius: t.background ? '3px' : '0',
                }}
              >
                {t.text}
              </span>
            ))}
            <div className="preview-dots">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`preview-dot ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="preview-controls">
          <div className="preview-progress-wrap">
            <div className="preview-progress-fill" style={{ width: `${overallProgress * 100}%` }} />
          </div>
          <div className="preview-btns">
            <button className="preview-ctrl-btn" onClick={handleRestart} title="最初から">↺</button>
            <button className="preview-play-btn" onClick={isPlaying ? handlePause : handlePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className="preview-time">{displayTime}s / {totalDuration}s</span>
          </div>
          <div className="preview-meta">
            <span>写真 {currentIdx + 1} / {photos.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
