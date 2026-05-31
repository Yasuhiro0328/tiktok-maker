#!/bin/bash
# update.sh
# コードを修正した後の更新デプロイ用スクリプト
# 実行方法: VPS上の /opt/services/tiktok-maker/current で
#   git pull origin main && bash deploy/update.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="/opt/services/tiktok-maker/current/backend"
FRONTEND_STATIC="/opt/services/proxy/www/tiktok-maker"
SERVICE_NAME="tiktok-maker"

echo "======================================"
echo " TikTok動画メーカー アップデート"
echo "======================================"

# ── バックエンド更新 ─────────────────────────────────
echo "[1/3] バックエンドを更新中..."
${BACKEND_DIR}/venv/bin/pip install -q -r ${BACKEND_DIR}/requirements.txt
systemctl restart ${SERVICE_NAME}
sleep 2
systemctl is-active ${SERVICE_NAME}
echo "      バックエンド更新完了"

# ── フロントエンド更新 ───────────────────────────────
echo "[2/3] フロントエンドをビルド中..."
cd ${REPO_DIR}/frontend
npm install --silent
npm run build

# 古いファイルを削除してから新しいファイルをコピー
rm -rf ${FRONTEND_STATIC}/assets
mkdir -p ${FRONTEND_STATIC}
cp -r dist/* ${FRONTEND_STATIC}/
echo "      フロントエンド更新完了 → ${FRONTEND_STATIC}"

echo ""
echo "======================================"
echo " アップデート完了！"
echo "======================================"
echo ""
echo "動作確認:"
echo "  curl http://127.0.0.1:4301/api/health"
echo "  curl -sI https://tiktok.haga-sys.jp/assets/ | grep content-type"
