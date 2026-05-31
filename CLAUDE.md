# CLAUDE.md — TikTok動画メーカー

Claude Code がこのリポジトリで作業するためのガイドです。

---

## プロジェクト概要

写真 + テキスト → TikTok向け縦型動画（MP4 / 1080×1920）を生成する Web ツール。  
動画生成後、ユーザーが手動で TikTok にアップロードする。

---

## ローカル起動

**ターミナルを2つ開いて実行する。**

```powershell
# バックエンド（ターミナル①）
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000

# フロントエンド（ターミナル②）
cd frontend
npm run dev
```

| URL | 用途 |
|-----|------|
| http://localhost:5173 | アプリ画面 |
| http://localhost:8000/docs | API ドキュメント |

起動スクリプト: `start-backend.bat` / `start-frontend.bat`

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| テキスト編集 | Fabric.js |
| バックエンド | Python 3.11 + FastAPI + uvicorn |
| 動画生成 | FFmpeg（H.264 / 1080×1920 / 30fps） |
| ドラッグ並べ替え | @dnd-kit |

---

## VPS 本番環境

### 接続情報

```powershell
ssh -i "C:\git\VPS\Yasuhiro.pem" root@162.43.89.182
```

### 構成

| 項目 | 値 |
|------|-----|
| サービス名 | `tiktok-maker` (systemd) |
| バックエンドポート | `127.0.0.1:4301` |
| バックエンドコード | `/opt/services/tiktok-maker/current/` |
| Python venv | `/opt/services/tiktok-maker/current/backend/venv/` |
| 環境変数ファイル | `/opt/services/tiktok-maker/current/backend/.env` |
| フロントエンド静的ファイル | `/opt/services/proxy/www/tiktok-maker/` ← **重要** |
| 公開 URL | https://tiktok.haga-sys.jp |

### リバースプロキシ

Caddy が **Docker コンテナ** で動作している。

```
/opt/services/proxy/
├── Caddyfile          ← Caddy 設定
├── docker-compose.yml ← caddy:2 イメージを起動
└── www/               ← コンテナ内 /srv/www にマウント
    └── tiktok-maker/  ← フロントエンドの静的ファイルはここ
```

Caddyfile の該当ブロック（`/opt/services/proxy/Caddyfile`）:

```caddy
tiktok.haga-sys.jp {
    encode gzip zstd
    handle /api/* {
        reverse_proxy 127.0.0.1:4301
    }
    handle {
        root * /srv/www/tiktok-maker
        try_files {path} /index.html
        file_server
    }
}
```

> ⚠️ フロントエンドを `/srv/www/tiktok-maker/`（ホスト直下）に置いてもコンテナに届かない。
> 必ず `/opt/services/proxy/www/tiktok-maker/` に置くこと。

---

## デプロイ手順（コード変更後）

### 1. ローカルで変更 → GitHub にプッシュ

```powershell
git add <変更ファイル>
git commit -m "説明"
git push origin main
```

GitHub リポジトリ: https://github.com/Yasuhiro0328/tiktok-maker

### 2. VPS で更新スクリプトを実行

```bash
ssh -i "C:\git\VPS\Yasuhiro.pem" root@162.43.89.182

# VPS 上で
cd /opt/services/tiktok-maker/current
git pull origin main
bash deploy/update.sh
```

`deploy/update.sh` が以下を自動実行する:
1. `pip install` で Python 依存関係を更新
2. `systemctl restart tiktok-maker` でバックエンドを再起動
3. `npm run build` でフロントエンドをビルド
4. `/opt/services/proxy/www/tiktok-maker/` に配備

### 3. 動作確認

```bash
# バックエンド
curl http://127.0.0.1:4301/api/health
# → {"status":"ok"}

# フロントエンド（JS が正しいContent-Typeで返るか）
curl -sI https://tiktok.haga-sys.jp/assets/index-*.js | grep content-type
# → content-type: text/javascript

# サービス状態
systemctl status tiktok-maker
journalctl -u tiktok-maker -n 20 --no-pager
```

---

## 環境変数（本番）

`/opt/services/tiktok-maker/current/backend/.env`:

```env
ALLOWED_ORIGIN=https://tiktok.haga-sys.jp
TEMP_DIR=/opt/services/tiktok-maker/shared/temp
FILE_TTL_HOURS=2
MAX_UPLOAD_MB=10
MAX_CONCURRENT_JOBS=2
```

---

## 主要ファイル

```
backend/
├── main.py              # FastAPI エントリーポイント・ジョブキュー管理
└── video_generator.py   # FFmpeg による動画生成・テキスト描画

frontend/src/
├── App.tsx              # ステッパー UI・ヘルプモーダル制御
├── App.css              # 全スタイル（ダークテーマ）
├── api/index.ts         # バックエンド API クライアント
└── components/
    ├── HelpModal.tsx        # 「？ 使い方」モーダル
    ├── Step1Upload.tsx      # 写真アップロード・並べ替え
    ├── Step2Text.tsx        # テキスト編集（Fabric.js）
    ├── Step4Generate.tsx    # 動画生成・キュー表示・ダウンロード
    └── PreviewPlayer.tsx    # プレビュー再生

deploy/
├── update.sh            # 更新デプロイスクリプト（VPS 上で実行）
├── Caddyfile.tom        # Caddy 設定参考
└── tiktok-tool.service  # systemd サービス定義（参考）
```

---

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/health | 死活確認 |
| POST | /api/upload | 画像アップロード（multipart） |
| POST | /api/generate | 動画生成開始 → jobId 返却 |
| GET | /api/status/{jobId} | 進捗確認（queued / processing / done / error） |
| GET | /api/download/{jobId} | 生成済み MP4 ダウンロード |

---

## 既知の注意点

- **フォントパス**: Linux(Ubuntu) では Noto CJK フォントが `opentype/noto/` にある。`truetype/noto/` は存在しないため `load_default()`（10px）にフォールバックしてしまう。`video_generator.py` の `load_font` を変更する際は要注意。
- **EXIF 回転**: `ImageOps.exif_transpose()` でスマホ写真の向きを補正済み。
- **キュー**: `MAX_CONCURRENT_JOBS` 環境変数で同時生成数を制限（デフォルト2）。
- **フロント配信場所**: Caddy は Docker で動いており `/opt/services/proxy/www/` をマウント。`/srv/www/` にファイルを置いてもコンテナに届かない。
