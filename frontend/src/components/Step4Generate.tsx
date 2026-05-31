import React, { useState } from 'react'
import { PhotoItem } from '../types'
import { uploadImages, startGenerate, getStatus, getDownloadUrl } from '../api'
import PreviewPlayer from './PreviewPlayer'

interface Props {
  photos: PhotoItem[]
}

type GenStatus = 'idle' | 'uploading' | 'queued' | 'generating' | 'done' | 'error'

export default function Step4Generate({ photos }: Props) {
  const [status, setStatus] = useState<GenStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [queuePos, setQueuePos] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const totalDuration = photos.reduce((sum, p) => sum + p.duration, 0)

  const handleGenerate = async () => {
    setStatus('uploading')
    setProgress(0)
    setQueuePos(0)
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
      setQueuePos(result.queuePos ?? 0)

      if (result.status === 'queued') {
        setStatus('queued')
      } else if (result.status === 'processing') {
        setStatus('generating')
      } else if (result.status === 'done') {
        setStatus('done')
        return
      } else if (result.status === 'error') {
        throw new Error(result.error || '動画生成中にエラーが発生しました')
      }
    }
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2 className="step-title">確認・動画生成</h2>
        <p className="step-desc">内容を最終確認して動画を生成します。完成したらダウンロードして TikTok にアップロードできます。</p>
      </div>

      <div className="step-tips">
        <div className="step-tips-title">この画面でできること</div>
        <div className="step-tips-grid">
          <div className="step-tip-item">
            <span className="step-tip-icon">👀</span>
            <div>
              <div className="step-tip-label">プレビュー確認</div>
              <div className="step-tip-text">「▶ プレビューを確認する」で動画のイメージを確認できます。内容を修正したい場合は「← 戻る」で前の手順に戻れます。</div>
            </div>
          </div>
          <div className="step-tip-item">
            <span className="step-tip-icon">🎬</span>
            <div>
              <div className="step-tip-label">動画の生成</div>
              <div className="step-tip-text">「🎬 動画を生成する」を押すと処理が始まります。写真の枚数によりますが、30秒〜2分程度かかります。</div>
            </div>
          </div>
          <div className="step-tip-item">
            <span className="step-tip-icon">⬇️</span>
            <div>
              <div className="step-tip-label">ダウンロード</div>
              <div className="step-tip-text">生成完了後に「⬇ 動画をダウンロード」ボタンが表示されます。MP4ファイルとして保存されます。</div>
            </div>
          </div>
          <div className="step-tip-item">
            <span className="step-tip-icon">📱</span>
            <div>
              <div className="step-tip-label">TikTokへアップロード</div>
              <div className="step-tip-text">ダウンロードしたMP4をTikTokアプリで投稿します。音楽はTikTok内で追加するのがおすすめです（著作権クリア済み楽曲が使えます）。</div>
            </div>
          </div>
        </div>
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

      {/* 待機中 */}
      {status === 'queued' && (
        <div className="progress-section">
          <div className="queue-badge">
            <span className="queue-pos">{queuePos}</span>
            <span className="queue-label">番目に待機中</span>
          </div>
          <p className="queue-desc">他のユーザーの動画生成が完了次第、自動的に開始されます。</p>
          <div className="queue-dots">
            <span /><span /><span />
          </div>
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
          <button className="btn-restart" onClick={() => { setStatus('idle'); setJobId(null); setProgress(0); setQueuePos(0) }}>
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
