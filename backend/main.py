import os
import uuid
import asyncio
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── 環境変数 ────────────────────────────────────────
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
TEMP_DIR       = Path(os.environ.get("TEMP_DIR", "temp"))
FILE_TTL_HOURS = int(os.environ.get("FILE_TTL_HOURS", "2"))
MAX_UPLOAD_MB  = int(os.environ.get("MAX_UPLOAD_MB", "10"))

TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ── アプリ ───────────────────────────────────────────
app = FastAPI(title="TikTok動画作成ツール API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict = {}


# ── モデル ───────────────────────────────────────────
class TextOverlay(BaseModel):
    text: str
    x: float
    y: float
    fontSize: int = 48
    color: str = "#FFFFFF"
    bold: bool = False
    shadow: bool = True
    background: bool = False
    bgOpacity: float = 0.6


class PhotoConfig(BaseModel):
    fileId: str
    duration: float = 3.0
    texts: list[TextOverlay] = []
    cropX: float = 0.0
    cropY: float = 0.0


class GenerateRequest(BaseModel):
    photos: list[PhotoConfig]
    musicUrl: Optional[str] = None
    musicName: Optional[str] = None


# ── ルーティング ─────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_images(files: list[UploadFile] = File(...)):
    uploaded = []
    for file in files:
        content = await file.read()
        if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(400, f"ファイルサイズが{MAX_UPLOAD_MB}MBを超えています: {file.filename}")

        ext = Path(file.filename).suffix.lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(400, f"対応外のファイル形式: {ext}")

        file_id = str(uuid.uuid4())
        save_path = TEMP_DIR / f"{file_id}{ext}"
        with open(save_path, "wb") as f:
            f.write(content)

        uploaded.append({"fileId": file_id, "filename": file.filename})

    return {"files": uploaded}


@app.post("/api/generate")
async def generate_video(req: GenerateRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "error": None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    background_tasks.add_task(run_video_generation, job_id, req)
    return {"jobId": job_id}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "ジョブが見つかりません")
    return jobs[job_id]


@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "ジョブが見つかりません")
    if jobs[job_id]["status"] != "done":
        raise HTTPException(400, "動画はまだ生成中です")

    output_path = TEMP_DIR / f"{job_id}.mp4"
    if not output_path.exists():
        raise HTTPException(404, "動画ファイルが見つかりません（期限切れの可能性があります）")

    return FileResponse(output_path, media_type="video/mp4", filename="tiktok_video.mp4")


# ── バックグラウンド処理 ────────────────────────────
async def run_video_generation(job_id: str, req: GenerateRequest):
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 10

        from video_generator import generate_video
        output_path = TEMP_DIR / f"{job_id}.mp4"
        await generate_video(req, output_path, job_id, jobs)

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100

        # 完了後にアップロード元画像を削除
        for photo in req.photos:
            for ext in [".jpg", ".jpeg", ".png"]:
                p = TEMP_DIR / f"{photo.fileId}{ext}"
                p.unlink(missing_ok=True)

    except Exception as e:
        import traceback
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e) or repr(e)
        print(f"動画生成エラー [{job_id}]: {e}")
        traceback.print_exc()


# ── 定期クリーンアップ ──────────────────────────────
@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(cleanup_loop())


async def cleanup_loop():
    while True:
        await asyncio.sleep(3600)
        cutoff = datetime.utcnow() - timedelta(hours=FILE_TTL_HOURS)
        for f in TEMP_DIR.iterdir():
            try:
                mtime = datetime.utcfromtimestamp(f.stat().st_mtime)
                if mtime < cutoff:
                    f.unlink(missing_ok=True)
            except Exception:
                pass

        old_jobs = [jid for jid, j in jobs.items()
                    if datetime.fromisoformat(j["createdAt"]) < cutoff]
        for jid in old_jobs:
            jobs.pop(jid, None)
