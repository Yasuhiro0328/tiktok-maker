# Claude Code 引き継ぎドキュメント
# TikTok動画作成ツール

---

## プロジェクト概要

写真複数枚 + テキスト + 著作権フリー音楽 → TikTok向け縦型動画（MP4）を生成するWebツール。
動画のTikTokへのアップロードは手動。将来的に公式API連携も視野に入れた設計。

---

## 現在の状態

### ✅ 実装済み（Phase 1 MVP）

- フロントエンド: React + TypeScript + Fabric.js（4ステップのウィザードUI）
  - Step1: 写真アップロード・順序変更・表示時間設定
  - Step2: テキスト配置エディタ（Fabric.jsによるドラッグ＆ドロップ）
  - Step3: Pixabay Music API連携による著作権フリー音楽検索・BGM設定
  - Step4: 動画生成・進捗表示・ダウンロード・TikTok手動アップロード手順表示

- バックエンド: Python + FastAPI + FFmpeg
  - 画像アップロード・一時保存
  - FFmpegによる動画生成（1080×1920、H.264、30fps）
  - 一時ファイルの自動削除（2時間）
  - VPS本番対応済み（環境変数・systemd・Nginx設定ファイルあり）

### ⚠️ 未実装（今後の課題）

- ログイン認証機能（後付け予定。main.pyに差し込み口のコメントあり）
- TikTok公式API連携（Phase 4予定）
- テキストアニメーション
- 動画プレビュー（生成前確認）
- トランジション選択

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| テキスト編集 | Fabric.js 5 |
| UIスタイル | カスタムCSS（ダークテーマ） |
| バックエンド | Python 3.11 + FastAPI |
| 動画生成 | FFmpeg |
| 音楽API | Pixabay Music API（無料・要APIキー） |
| ドラッグ並べ替え | @dnd-kit/core + @dnd-kit/sortable |

---

## ファイル構成

```
tiktok-tool/
├── backend/
│   ├── main.py              # FastAPI エントリーポイント
│   ├── video_generator.py   # FFmpegによる動画生成ロジック
│   ├── requirements.txt     # Python依存パッケージ
│   └── .env.example         # 環境変数テンプレート
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # メインコンポーネント（ステッパーUI）
│   │   ├── App.css          # スタイル（ダークテーマ）
│   │   ├── types/index.ts   # 型定義
│   │   ├── api/index.ts     # バックエンドAPIクライアント
│   │   └── components/
│   │       ├── Step1Upload.tsx   # 写真アップロード
│   │       ├── Step2Text.tsx     # テキスト編集（Fabric.js）
│   │       ├── Step3Music.tsx    # 音楽検索（Pixabay API）
│   │       └── Step4Generate.tsx # 動画生成・ダウンロード
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts       # /api → localhost:8000 へproxyあり
│   └── tsconfig.json
├── deploy/
│   ├── tiktok-tool.nginx    # Nginx設定
│   ├── tiktok-tool.service  # systemdサービス
│   ├── deploy.sh            # 初回デプロイスクリプト
│   ├── update.sh            # 更新デプロイスクリプト
│   └── README-VPS.md        # VPSデプロイ手順書
├── check-env.bat            # Windows環境チェック
├── start-backend.bat        # Windowsバックエンド起動
├── start-frontend.bat       # Windowsフロントエンド起動
└── README.md                # ローカル起動手順
```

---

## バックエンドAPI一覧

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /api/health | 死活確認 |
| POST | /api/upload | 画像アップロード（multipart） |
| POST | /api/generate | 動画生成開始 → jobId返却 |
| GET | /api/status/{jobId} | 生成進捗確認（pending/processing/done/error） |
| GET | /api/download/{jobId} | 生成済みMP4ダウンロード |

※ /api/music/search は未実装（Step3はフロントから直接Pixabay APIを叩いている）

---

## ローカル起動方法（Windows）

```powershell
# ターミナル①（バックエンド）
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# ターミナル②（フロントエンド）
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。

## ローカル起動方法（Mac/Linux）

```bash
# バックエンド
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# フロントエンド（別ターミナル）
cd frontend
npm install
npm run dev
```

---

## 環境変数（backend/.env）

```env
ALLOWED_ORIGIN=https://yourdomain.com  # 本番ドメイン（ローカルはデフォルト"*"でOK）
TEMP_DIR=temp                          # 一時ファイル保存先（ローカルはこのまま）
FILE_TTL_HOURS=2                       # 一時ファイル保持時間
MAX_UPLOAD_MB=10                       # アップロード上限MB
```

---

## VPSデプロイ（Xserver VPS + Ubuntu 22.04/24.04）

```bash
# VPS上で
scp -r ./tiktok-tool root@<VPSのIP>:/tmp/
ssh root@<VPSのIP>
cd /tmp/tiktok-tool
bash deploy/deploy.sh
```

詳細は deploy/README-VPS.md を参照。

---

## 既知の問題・対応済みバグ

1. Pixabay APIエンドポイント修正済み
   - 誤: /api/videos/music/
   - 正: /api/music/

2. Windows用TEMP_DIRのデフォルト値修正済み
   - 誤: /var/www/tiktok-tool/temp
   - 正: temp（相対パス）

3. Pythonバージョン依存問題
   - Python 3.14はpydantic-core・Pillowが未対応
   - Python 3.11を使用すること

---

## ログイン機能の追加方針（未実装）

main.py に以下のように差し込む設計：

```python
from fastapi import Depends
from auth import verify_token  # 別途作成

@app.post("/api/upload")
async def upload_images(
    files: list[UploadFile] = File(...),
    user = Depends(verify_token)  # この1行を追加するだけ
):
    ...
```

シンプルなBasic認証またはJWTトークン認証を想定。

---

## ユーザー情報

- OS: Windows
- Python: 3.11（3.14は非対応パッケージあり）
- Node.js: v24.15.0
- FFmpeg: インストール済み（PATH設定済み）
- デプロイ先: Xserver VPS（Ubuntu 22.04/24.04）予定
- 上流工程（要件定義・設計）はユーザーが担当、コーディングはClaude担当のスタイル
