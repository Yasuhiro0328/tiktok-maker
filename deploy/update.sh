#!/bin/bash
# update.sh
# コードを修正した後の更新デプロイ用スクリプト
# 実行方法: bash update.sh

set -e

DEPLOY_DIR="/var/www/tiktok-tool"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "======================================"
echo " TikTok動画メーカー アップデート"
echo "======================================"

# ── バックエンド更新 ─────────────────────────────────
echo "[1/3] バックエンドを更新中..."
sudo cp ${REPO_DIR}/backend/main.py           ${DEPLOY_DIR}/backend/
sudo cp ${REPO_DIR}/backend/video_generator.py ${DEPLOY_DIR}/backend/
sudo cp ${REPO_DIR}/backend/requirements.txt   ${DEPLOY_DIR}/backend/

sudo -u www-data ${DEPLOY_DIR}/backend/venv/bin/pip install -q -r ${DEPLOY_DIR}/backend/requirements.txt
sudo systemctl restart tiktok-tool
echo "      バックエンド更新完了"

# ── フロントエンド更新 ───────────────────────────────
echo "[2/3] フロントエンドをビルド中..."
cd ${REPO_DIR}/frontend
npm install --silent
npm run build
sudo cp -r dist/* ${DEPLOY_DIR}/frontend/
sudo chown -R www-data:www-data ${DEPLOY_DIR}/frontend
echo "      フロントエンド更新完了"

# ── Nginx リロード ───────────────────────────────────
echo "[3/3] Nginxをリロード中..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "======================================"
echo " アップデート完了！"
echo "======================================"
