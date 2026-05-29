import React, { useEffect, useRef, useState } from 'react'
import { MusicItem } from '../types'

interface Props {
  selectedMusic: MusicItem | null
  onMusicChange: (music: MusicItem | null) => void
}

export default function Step3Music({ selectedMusic, onMusicChange }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const loadFile = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('音声ファイルを選択してください（MP3 / M4A / WAV / OGG）')
      return
    }

    // 前のBlobURLを解放
    if (selectedMusic?.url.startsWith('blob:')) {
      URL.revokeObjectURL(selectedMusic.url)
    }
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)

    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio(objectUrl)
    audio.addEventListener('loadedmetadata', () => {
      onMusicChange({
        id: 1,
        name: file.name.replace(/\.[^.]+$/, ''),
        artist: 'ローカルファイル',
        duration: Math.round(audio.duration) || 0,
        url: objectUrl,
        previewUrl: objectUrl,
      })
    })
    audio.addEventListener('error', () => {
      alert('音声ファイルの読み込みに失敗しました。')
      URL.revokeObjectURL(objectUrl)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  const handlePlayPause = () => {
    if (!selectedMusic) return
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedMusic.previewUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleClear = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
    if (selectedMusic?.url.startsWith('blob:')) {
      URL.revokeObjectURL(selectedMusic.url)
    }
    onMusicChange(null)
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2 className="step-title">音楽を選ぶ</h2>
        <p className="step-desc">BGMに使用する音声ファイルをアップロードしてください。スキップも可能です。</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {!selectedMusic ? (
        <div
          className={`music-dropzone ${isDragging ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="music-dz-icon">🎵</div>
          <div className="music-dz-text">音声ファイルをドロップ、またはクリックして選択</div>
          <div className="music-dz-hint">MP3 / M4A / WAV / OGG 対応</div>
        </div>
      ) : (
        <div className="music-file-card">
          <button className="music-play-btn" onClick={handlePlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="music-file-info">
            <div className="music-file-name">{selectedMusic.name}</div>
            <div className="music-file-meta">
              {formatDuration(selectedMusic.duration)} · ローカルファイル
            </div>
          </div>
          <button
            className="music-file-change"
            onClick={() => fileInputRef.current?.click()}
          >
            変更
          </button>
          <button className="music-file-remove" onClick={handleClear}>✕</button>
        </div>
      )}

      <p className="music-skip-note">
        BGMなしで動画を作ることもできます。その場合はそのまま「次へ」を押してください。
      </p>
    </div>
  )
}
