#!/bin/bash
# deploy.sh
# VPS上で初回セットアップ時に実行するスクリプト
# 実行方法: bash deploy.sh

set -e  # エラー時に停止

DEPLOY_DIR="/var/www/tiktok-tool"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"  # このスクリプトの親ディレクトリ

echo "======================================"
echo " TikTok動画メーカー デプロイ開始"
echo "======================================"

# ── 1. 依存パッケージのインストール ─────────────────
echo "[1/6] システムパッケージをインストール中..."
sudo apt-get update -q
sudo apt-get install -y \
    nginx \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    fonts-noto-cjk \
    nodejs \
    npm \
    certbot \
    python3-certbot-nginx

echo "      FFmpegバージョン: $(ffmpeg -version 2>&1 | head -1)"
echo "      Node.jsバージョン: $(node -v)"

# ── 2. ディレクトリ準備 ──────────────────────────────
echo "[2/6] ディレクトリを準備中..."
sudo mkdir -p ${DEPLOY_DIR}/{backend,frontend,temp}
sudo chown -R www-data:www-data ${DEPLOY_DIR}
sudo chmod -R 755 ${DEPLOY_DIR}

# ── 3. バックエンドのセットアップ ────────────────────
echo "[3/6] バックエンドをセットアップ中..."
sudo cp -r ${REPO_DIR}/backend/* ${DEPLOY_DIR}/backend/

# .env ファイルが存在しない場合のみコピー
if [ ! -f "${DEPLOY_DIR}/backend/.env" ]; then
    sudo cp ${DEPLOY_DIR}/backend/.env.example ${DEPLOY_DIR}/backend/.env
    echo ""
    echo "  ⚠️  ${DEPLOY_DIR}/backend/.env を編集してドメインを設定してください"
    echo ""
fi

# Python 仮想環境
sudo -u www-data python3.11 -m venv ${DEPLOY_DIR}/backend/venv
sudo -u www-data ${DEPLOY_DIR}/backend/venv/bin/pip install -q -r ${DEPLOY_DIR}/backend/requirements.txt

echo "      Pythonパッケージのインストール完了"

# ── 4. フロントエンドのビルド ────────────────────────
echo "[4/6] フロントエンドをビルド中..."
cd ${REPO_DIR}/frontend
npm install --silent
npm run build

sudo cp -r dist/* ${DEPLOY_DIR}/frontend/
sudo chown -R www-data:www-data ${DEPLOY_DIR}/frontend

echo "      フロントエンドビルド完了"

# ── 5. Nginx の設定 ──────────────────────────────────
echo "[5/6] Nginxを設定中..."
sudo cp ${REPO_DIR}/deploy/tiktok-tool.nginx /etc/nginx/sites-available/tiktok-tool

# デフォルトサイトを無効化
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/tiktok-tool /etc/nginx/sites-enabled/tiktok-tool

sudo nginx -t && sudo systemctl reload nginx
echo "      Nginx設定完了"

# ── 6. systemd サービスの設定 ────────────────────────
echo "[6/6] systemdサービスを設定中..."
sudo cp ${REPO_DIR}/deploy/tiktok-tool.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tiktok-tool
sudo systemctl restart tiktok-tool

sleep 2
STATUS=$(sudo systemctl is-active tiktok-tool)
echo "      サービス状態: ${STATUS}"

# ── 完了 ────────────────────────────────────────────
echo ""
echo "======================================"
echo " デプロイ完了！"
echo "======================================"
echo ""
echo "次のステップ:"
echo "  1. ${DEPLOY_DIR}/backend/.env を編集してドメインを設定"
echo "  2. deploy/tiktok-tool.nginx の server_name をドメインに変更"
echo "  3. HTTPS化: sudo certbot --nginx -d yourdomain.com"
echo "  4. サービス再起動: sudo systemctl restart tiktok-tool nginx"
echo ""
echo "動作確認:"
echo "  curl http://localhost:8000/api/health"
echo "  sudo systemctl status tiktok-tool"
echo "  sudo journalctl -u tiktok-tool -f"
echo ""
