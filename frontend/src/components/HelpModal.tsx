import React, { useState } from 'react'

interface Props {
  onClose: () => void
}

const SECTIONS = [
  {
    id: 'flow',
    icon: '🗺',
    title: '全体の流れ',
    content: (
      <div className="help-flow">
        <div className="help-flow-step">
          <div className="help-flow-num">1</div>
          <div className="help-flow-body">
            <div className="help-flow-title">写真をアップロード</div>
            <div className="help-flow-desc">動画にしたい写真を選んで、順番・表示時間・切り取り位置を調整します。</div>
          </div>
        </div>
        <div className="help-flow-arrow">↓</div>
        <div className="help-flow-step">
          <div className="help-flow-num">2</div>
          <div className="help-flow-body">
            <div className="help-flow-title">テキストを追加（任意）</div>
            <div className="help-flow-desc">各写真にテキストを自由な位置・デザインで追加できます。スキップしてもOKです。</div>
          </div>
        </div>
        <div className="help-flow-arrow">↓</div>
        <div className="help-flow-step">
          <div className="help-flow-num">3</div>
          <div className="help-flow-body">
            <div className="help-flow-title">動画を生成してダウンロード</div>
            <div className="help-flow-desc">内容を確認して動画を生成します。完成したらダウンロードして TikTok にアップロードします。</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'step1',
    icon: '🖼',
    title: 'STEP 1｜写真のアップロード',
    content: (
      <ul className="help-list">
        <li>
          <span className="help-tag">追加</span>
          点線のエリアをクリック、またはファイルをドラッグ＆ドロップして写真を追加します。複数まとめて選択できます（最大20枚）。
        </li>
        <li>
          <span className="help-tag">並び替え</span>
          写真カードの画像部分を掴んで（⠿マーク）左右にドラッグすると動画の順番を変えられます。
        </li>
        <li>
          <span className="help-tag">表示時間</span>
          各写真カードの下部にある数値欄で、その写真を何秒表示するかを設定します（1〜10秒）。
        </li>
        <li>
          <span className="help-tag">位置調整（✂）</span>
          ✂ボタンを押すとモーダルが開きます。横長の写真などを縦型にトリミングするとき、どの部分を切り出すかドラッグで調整できます。
        </li>
        <li>
          <span className="help-tag">削除（✕）</span>
          ✕ボタンで不要な写真を削除できます。
        </li>
      </ul>
    ),
  },
  {
    id: 'step2',
    icon: '✏️',
    title: 'STEP 2｜テキストの追加・編集',
    content: (
      <ul className="help-list">
        <li>
          <span className="help-tag">写真の切り替え</span>
          上部のサムネイルタブをクリックして、テキストを編集したい写真を選択します。
        </li>
        <li>
          <span className="help-tag">テキスト追加</span>
          「＋ テキスト追加」ボタンを押すと、プレビューの中央に「テキスト」という文字が追加されます。
        </li>
        <li>
          <span className="help-tag">移動</span>
          追加されたテキストをドラッグして、好きな位置に移動できます。
        </li>
        <li>
          <span className="help-tag">内容・スタイルの変更</span>
          テキストをクリックして選択すると右側に編集パネルが表示されます。テキスト内容・サイズ・色・太字・影・背景を変更し「適用」ボタンで確定してください。
        </li>
        <li>
          <span className="help-tag">影</span>
          テキストに黒い影を付けて明るい背景でも読みやすくします。
        </li>
        <li>
          <span className="help-tag">背景</span>
          テキストの後ろに半透明の黒い帯を表示します。どんな背景でも読みやすくなります（影との併用不可）。
        </li>
        <li>
          <span className="help-tag">テキスト削除</span>
          テキストを選択した状態で「削除」ボタンを押すと消えます。
        </li>
        <li>
          <span className="help-tag">スキップ</span>
          テキストが不要な場合はそのまま「次へ」を押してください。
        </li>
      </ul>
    ),
  },
  {
    id: 'step3',
    icon: '🎬',
    title: 'STEP 3｜動画の生成とダウンロード',
    content: (
      <ul className="help-list">
        <li>
          <span className="help-tag">内容確認</span>
          写真の枚数・合計時間・テキスト数が一覧表示されます。間違いがあれば「← 戻る」で前のステップに戻って修正できます。
        </li>
        <li>
          <span className="help-tag">プレビュー</span>
          「▶ プレビューを確認する」で動画のイメージを確認できます（テキストの見え方も確認できます）。
        </li>
        <li>
          <span className="help-tag">生成開始</span>
          「🎬 動画を生成する」を押すと、写真をサーバーに送信して動画を生成します。枚数によりますが30秒〜2分程度かかります。
        </li>
        <li>
          <span className="help-tag">ダウンロード</span>
          完成したら「⬇ 動画をダウンロード」でMP4ファイルを保存します。
        </li>
        <li>
          <span className="help-tag">TikTokへのアップロード</span>
          ダウンロードしたMP4を TikTok アプリまたはブラウザからアップロードします。音楽はTikTokアプリ内で追加するのがおすすめです（著作権処理済みの楽曲が使えます）。
        </li>
      </ul>
    ),
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'よくある質問とコツ',
    content: (
      <ul className="help-list">
        <li>
          <span className="help-tag">Q. 対応している画像形式は？</span>
          JPEG・PNG に対応しています。1枚あたり最大10MBまでです。
        </li>
        <li>
          <span className="help-tag">Q. 動画の縦横比は？</span>
          TikTok の縦型動画（9:16 / 1080×1920）に最適化されています。横長の写真は自動的にトリミングされます。
        </li>
        <li>
          <span className="help-tag">Q. 音楽はどうやって追加する？</span>
          動画生成後、TikTok アプリで「サウンドを追加」から曲を選ぶのが一番簡単で著作権的にも安全です。
        </li>
        <li>
          <span className="help-tag">コツ</span>
          写真ごとに表示時間を変えて、見せたい写真は長め（5〜7秒）・切り替え用は短め（2〜3秒）にするとリズムが生まれます。
        </li>
        <li>
          <span className="help-tag">コツ</span>
          テキストは「背景あり」にすると、どんな写真の上でも読みやすくなりおすすめです。
        </li>
      </ul>
    ),
  },
]

export default function HelpModal({ onClose }: Props) {
  const [openId, setOpenId] = useState<string>('flow')

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <div className="help-header-title">
            <span>📖</span>
            <span>使い方ガイド</span>
          </div>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>

        <div className="help-body">
          {SECTIONS.map(sec => (
            <div key={sec.id} className="help-section">
              <button
                className={`help-section-header ${openId === sec.id ? 'open' : ''}`}
                onClick={() => setOpenId(openId === sec.id ? '' : sec.id)}
              >
                <span className="help-section-icon">{sec.icon}</span>
                <span className="help-section-title">{sec.title}</span>
                <span className="help-section-chevron">{openId === sec.id ? '▲' : '▼'}</span>
              </button>
              {openId === sec.id && (
                <div className="help-section-body">
                  {sec.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
