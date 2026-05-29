# VPSデプロイ手順（Xserver VPS + Ubuntu 22.04/24.04）

## 前提条件

- Xserver VPS でサーバーを契約済み
- SSH接続できる状態
- ドメインがある場合はVPSのIPに向けておく（なければIPアドレスでも動作可）

---

## ① VPSにSSH接続

```bash
ssh root@<VPSのIPアドレス>
```

---

## ② コードをVPSに転送

**方法A: SCP（手元PCから）**
```bash
scp -r ./tiktok-tool root@<VPSのIP>:/tmp/
```

**方法B: GitHubを経由する場合**
```bash
# VPS上で
apt install git -y
git clone https://github.com/yourname/tiktok-tool.git /tmp/tiktok-tool
```

---

## ③ デプロイスクリプトを実行

```bash
cd /tmp/tiktok-tool
bash deploy/deploy.sh
```

自動で以下をインストール・設定します：
- Nginx
- Python 3.11 + 仮想環境
- FFmpeg（日本語フォント含む）
- Node.js（フロントエンドビルド用）
- systemdサービス登録

---

## ④ 設定ファイルを編集

```bash
# ドメインを設定
sudo nano /var/www/tiktok-tool/backend/.env
```

```env
ALLOWED_ORIGIN=https://yourdomain.com   # ← 自分のドメインに変更
TEMP_DIR=/var/www/tiktok-tool/temp
FILE_TTL_HOURS=2
MAX_UPLOAD_MB=10
```

```bash
# Nginx設定のドメインを変更
sudo nano /etc/nginx/sites-available/tiktok-tool
# server_name の yourdomain.com を実際のドメインに変更

# 設定を反映
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl restart tiktok-tool
```

---

## ⑤ HTTPS化（推奨）

ドメインがある場合は無料でHTTPS化できます。

```bash
sudo certbot --nginx -d yourdomain.com
```

指示に従って操作するだけで自動でSSL証明書が設定されます。

---

## ⑥ 動作確認

```bash
# バックエンドの確認
curl http://localhost:8000/api/health
# → {"status":"ok"} が返ればOK

# サービスの状態確認
sudo systemctl status tiktok-tool

# ログの確認
sudo journalctl -u tiktok-tool -f
```

ブラウザで `http://<VPSのIP>` または `https://yourdomain.com` を開いて動作確認。

---

## コードを修正した後の更新

```bash
# VPS上で
cd /tmp/tiktok-tool
git pull  # または scp で最新ファイルを転送してから
bash deploy/update.sh
```

---

## ログイン機能の追加（後から）

現在はログイン機能なしで動作します。後からログイン機能を追加する場合、
`backend/main.py` に以下のような形で差し込むことができます：

```python
# 追加予定の場所（main.py の上部に追記）
from fastapi import Depends
from auth import verify_token   # 後で作成する認証モジュール

# 各エンドポイントに追加
@app.post("/api/upload")
async def upload_images(
    files: list[UploadFile] = File(...),
    user = Depends(verify_token)   # ← この1行を追加するだけ
):
    ...
```

---

## ファイル構成（VPS上）

```
/var/www/tiktok-tool/
├── backend/
│   ├── main.py
│   ├── video_generator.py
│   ├── requirements.txt
│   ├── .env          ← 環境変数（ドメイン等）
│   └── venv/         ← Python仮想環境
├── frontend/         ← ビルド済み静的ファイル
└── temp/             ← 一時ファイル（2時間で自動削除）

/etc/nginx/sites-available/tiktok-tool   ← Nginx設定
/etc/systemd/system/tiktok-tool.service  ← systemd設定
```

---

## トラブルシューティング

| 症状 | 確認コマンド | 対処 |
|------|-------------|------|
| サイトが開かない | `sudo systemctl status nginx` | Nginxを再起動 |
| APIがエラー | `sudo journalctl -u tiktok-tool -n 50` | ログを確認 |
| 動画生成が失敗 | `which ffmpeg` | FFmpegのインストール確認 |
| 文字化け | `fc-list \| grep -i noto` | Notoフォントのインストール確認 |
