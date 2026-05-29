import React, { useState } from 'react'
import { PhotoItem, Step } from './types'
import Step1Upload from './components/Step1Upload'
import Step2Text from './components/Step2Text'
import Step4Generate from './components/Step4Generate'
import './App.css'

const STEPS = [
  { num: 1, label: '写真' },
  { num: 2, label: 'テキスト' },
  { num: 3, label: '生成' },
]

export default function App() {
  const [step, setStep] = useState<Step>(1)
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  const canNext = () => {
    if (step === 1) return photos.length > 0
    return true
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">TikTok動画メーカー</span>
        </div>
      </header>

      {/* ステップインジケーター */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              className={`step-dot ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}
              onClick={() => step > s.num && setStep(s.num as Step)}
            >
              <div className="step-dot-inner">
                {step > s.num ? '✓' : s.num}
              </div>
              <div className="step-dot-label">{s.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-line ${step > s.num ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ステップコンテンツ */}
      <main className="app-main">
        {step === 1 && <Step1Upload photos={photos} onPhotosChange={setPhotos} />}
        {step === 2 && <Step2Text photos={photos} onPhotosChange={setPhotos} />}
        {step === 3 && <Step4Generate photos={photos} />}
      </main>

      {/* ナビゲーション */}
      {step < 3 && (
        <div className="nav-bar">
          <button
            className="btn-back"
            onClick={() => setStep((step - 1) as Step)}
            disabled={step === 1}
          >
            ← 戻る
          </button>
          <div className="nav-step-info">{step} / 3</div>
          <button
            className="btn-next"
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canNext()}
          >
            {step === 2 ? '確認へ →' : '次へ →'}
          </button>
        </div>
      )}
    </div>
  )
}
