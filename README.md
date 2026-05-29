# TikTok動画メーカー - セットアップ手順

## 必要な環境

- Python 3.11以上
- Node.js 18以上
- FFmpeg
- ブラウザ: Chrome または Edge（最新版）

---

## FFmpegのインストール

### Mac
```bash
brew install ffmpeg
```

### Windows
1. https://ffmpeg.org/download.html からダウンロード
2. 解凍してC:\ffmpegなどに配置
3. 環境変数PATHにC:\ffmpeg\binを追加

### Ubuntu/Debian
```bash
sudo apt install ffmpeg
```

---

## バックエンドの起動

```bash
cd backend

# 仮想環境の作成（初回のみ）
python -m venv venv

# 仮想環境の有効化
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# パッケージインストール（初回のみ）
pip install -r requirements.txt

# サーバー起動
uvicorn main:app --reload --port 8000
```

起動確認: http://localhost:8000/docs でAPIドキュメントが見えればOK

---

## フロントエンドの起動

```bash
cd frontend

# パッケージインストール（初回のみ）
npm install

# 開発サーバー起動
npm run dev
```

起動確認: http://localhost:5173 をブラウザで開く

---

## 使い方

1. **Step 1 - 写真を選ぶ**
   - 写真をドラッグ＆ドロップまたはクリックして追加
   - 各写真の表示時間を設定（デフォルト3秒）
   - ドラッグで順序を変更可能

2. **Step 2 - テキストを追加**
   - 「＋ テキスト追加」ボタンで写真にテキストを重ねる
   - テキストはキャンバス上でドラッグして位置を調整
   - フォントサイズ・色・太字・影を設定して「適用」

3. **Step 3 - 音楽を選ぶ（任意）**
   - Pixabay APIキーを入力（https://pixabay.com/api/docs/ で無料取得）
   - キーワードで著作権フリー音楽を検索
   - ▶ボタンでプレビュー、「BGMに設定」で選択
   - 音楽なしでもOK

4. **Step 4 - 動画生成**
   - 設定内容を確認して「🎬 動画を生成する」をクリック
   - 生成完了後「⬇ 動画をダウンロード」でMP4を保存
   - TikTokアプリまたは tiktok.com/upload で手動アップロード

---

## 出力仕様

| 項目 | 仕様 |
|------|------|
| 解像度 | 1080×1920px（縦型 9:16） |
| コーデック | H.264 / AAC |
| フレームレート | 30fps |
| ファイル形式 | MP4 |

---

## トラブルシューティング

### FFmpegが見つからないエラー
→ FFmpegがインストールされているか確認。`ffmpeg -version` をターミナルで実行。

### テキストが文字化けする
→ 日本語フォントをインストール:
- Ubuntu: `sudo apt install fonts-noto-cjk`
- Mac: Noto Fontsはデフォルトで対応

### バックエンドに接続できない
→ http://localhost:8000 が起動しているか確認。CORSエラーの場合はバックエンドのmain.pyのallow_originsを確認。
