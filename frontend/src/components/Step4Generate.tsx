import React, { useState } from 'react'
import { PhotoItem } from '../types'
import { uploadImages, startGenerate, getStatus, getDownloadUrl } from '../api'
import PreviewPlayer from './PreviewPlayer'

interface Props {
  photos: PhotoItem[]
}

type GenStatus = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

export default function Step4Generate({ photos }: Props) {
  const [status, setStatus] = useState<GenStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const totalDuration = photos.reduce((sum, p) => sum + p.duration, 0)

  const handleGenerate = async () => {
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      // 1. 画像アップロード
      const files = photos.map(p => p.file)
      const uploaded = await uploadImages(files)
      setProgress(20)

      // 2. fileIdのマッピング
      const photoConfigs = photos.map((p, i) => ({
        fileId: uploaded[i].fileId,
        duration: p.duration,
        texts: p.texts,
        cropX: p.cropX ?? 0,
        cropY: p.cropY ?? 0,
      }))

      // 3. 動画生成開始
      setStatus('generating')
      const id = await startGenerate({ photos: photoConfigs })
      setJobId(id)
      setProgress(30)

      // 4. 完了までポーリング
      await pollUntilDone(id)

    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.message || '不明なエラーが発生しました')
    }
  }

  const pollUntilDone = async (id: string) => {
    while (true) {
      await new Promise(r => setTimeout(r, 1500))
      const result = await getStatus(id)
      setProgress(result.progress || 0)

      if (result.status === 'done') {
        setStatus('done')
        return
      }
      if (result.status === 'error') {
        throw new Error(result.error || '動画生成中にエラーが発生しました')
      }
    }
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2 className="step-title">確認・動画生成</h2>
        <p className="step-desc">内容を確認して動画を生成します。</p>
      </div>

      {/* サマリー */}
      <div className="summary-card">
        <div className="summary-row">
          <span className="summary-label">📷 写真</span>
          <span className="summary-value">{photos.length}枚</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">⏱ 合計時間</span>
          <span className="summary-value">{totalDuration}秒</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">📐 出力形式</span>
          <span className="summary-value">1080×1920 / MP4 / H.264</span>
        </div>
      </div>

      {/* 写真サムネイル一覧 */}
      <div className="summary-photos">
        {photos.map((p, i) => (
          <div key={p.id} className="summary-photo">
            <img
              src={p.previewUrl}
              alt=""
              style={{ objectPosition: `${(0.5 + (p.cropX ?? 0)) * 100}% ${(0.5 + (p.cropY ?? 0)) * 100}%` }}
            />
            <div className="summary-photo-info">
              <span>{i + 1}</span>
              <span>{p.duration}秒</span>
              {p.texts.length > 0 && <span className="text-badge">T×{p.texts.length}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* プレビュー＆生成ボタン */}
      {status === 'idle' && (
        <div className="generate-actions">
          <button className="btn-preview" onClick={() => setShowPreview(true)}>
            ▶ プレビューを確認する
          </button>
          <button className="btn-generate" onClick={handleGenerate}>
            🎬 動画を生成する
          </button>
        </div>
      )}

      {/* 進捗 */}
      {(status === 'uploading' || status === 'generating') && (
        <div className="progress-section">
          <div className="progress-label">
            {status === 'uploading' ? '📤 写真をアップロード中...' : '🎬 動画を生成中...'}
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-pct">{progress}%</div>
        </div>
      )}

      {/* 完了 */}
      {status === 'done' && jobId && (
        <div className="done-section">
          <div className="done-icon">🎉</div>
          <div className="done-title">動画の生成が完了しました！</div>
          <a className="btn-download" href={getDownloadUrl(jobId)} download="tiktok_video.mp4">
            ⬇ 動画をダウンロード
          </a>
          <div className="upload-guide">
            <div className="guide-title">📱 TikTokへのアップロード手順</div>
            <ol className="guide-steps">
              <li>TikTokアプリまたは <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer">tiktok.com/upload</a> を開く</li>
              <li>「投稿を作成」→「ファイルをアップロード」を選択</li>
              <li>ダウンロードした動画ファイルを選択</li>
              <li>アプリ内の「サウンドを追加」で好みの音楽を設定（著作権処理済みの楽曲が使えます）</li>
              <li>キャプション・ハッシュタグ等を設定して投稿</li>
            </ol>
          </div>
          <div className="music-tip">
            🎵 TikTokアプリ内で音楽を追加すると、著作権をクリアした楽曲が使え、アルゴリズムにも有利です。
          </div>
          <button className="btn-restart" onClick={() => { setStatus('idle'); setJobId(null); setProgress(0) }}>
            別の動画を作る
          </button>
        </div>
      )}

      {/* エラー */}
      {status === 'error' && (
        <div className="error-section">
          <div className="error-title">⚠️ エラーが発生しました</div>
          <div className="error-msg">{errorMsg}</div>
          <button className="btn-retry" onClick={() => setStatus('idle')}>再試行</button>
        </div>
      )}

      {showPreview && (
        <PreviewPlayer
          photos={photos}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
