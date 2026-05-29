import asyncio
import subprocess
import shutil
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import tempfile
import os


async def generate_video(req, output_path: Path, job_id: str, jobs: dict):
    """
    写真 + テキスト + 音楽 → MP4動画生成
    出力: 1080x1920 (TikTok縦型), 30fps, H.264
    """
    work_dir = output_path.parent / f"work_{job_id}"
    work_dir.mkdir(exist_ok=True)

    try:
        jobs[job_id]["progress"] = 20

        # 1. 各写真にテキストを合成して連番画像として出力
        frame_paths = []
        fps = 30

        for idx, photo_config in enumerate(req.photos):
            # 元画像を探す
            photo_path = find_photo(photo_config.fileId, output_path.parent)
            if not photo_path:
                raise FileNotFoundError(f"画像が見つかりません: {photo_config.fileId}")

            composed = compose_image(photo_path, photo_config)

            # duration秒分のフレームを1枚の静止画として保存（FFmpegで時間指定するため1枚でOK）
            frame_path = work_dir / f"frame_{idx:04d}.jpg"
            composed.save(frame_path, "JPEG", quality=95)
            frame_paths.append((frame_path, photo_config.duration))

        jobs[job_id]["progress"] = 50

        # 2. FFmpegのconcat用リストファイルを作成
        # Windowsバックスラッシュをスラッシュに変換（FFmpeg concat要件）
        concat_file = work_dir / "concat.txt"
        with open(concat_file, "w", encoding="utf-8") as f:
            for frame_path, duration in frame_paths:
                p = frame_path.resolve().as_posix()
                f.write(f"file '{p}'\n")
                f.write(f"duration {duration}\n")
            # 最後のフレームを再度追記（FFmpegのconcat要件）
            last_p = frame_paths[-1][0].resolve().as_posix()
            f.write(f"file '{last_p}'\n")

        jobs[job_id]["progress"] = 60

        # 3. 音楽ダウンロード（指定がある場合）
        music_path = None
        if req.musicUrl:
            music_path = work_dir / "bgm.mp3"
            urllib.request.urlretrieve(req.musicUrl, music_path)

        jobs[job_id]["progress"] = 70

        # 4. FFmpegで動画生成
        await run_ffmpeg(concat_file, music_path, output_path)

        jobs[job_id]["progress"] = 95

    finally:
        # 作業ディレクトリを削除
        shutil.rmtree(work_dir, ignore_errors=True)


def find_photo(file_id: str, search_dir: Path) -> Path | None:
    """file_idに対応する画像ファイルを検索"""
    for ext in [".jpg", ".jpeg", ".png"]:
        candidate = search_dir / f"{file_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def compose_image(photo_path: Path, photo_config) -> Image.Image:
    """
    写真を1080x1920にリサイズ・クロップし、テキストを合成
    cropX/cropY (-0.5〜0.5) でクロップ位置を指定（0=中央）
    """
    TARGET_W, TARGET_H = 1080, 1920

    img = Image.open(photo_path).convert("RGB")
    img_w, img_h = img.size
    scale = max(TARGET_W / img_w, TARGET_H / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    # cropX/cropY を使ってクロップ位置を決定
    crop_x = getattr(photo_config, 'cropX', 0.0)
    crop_y = getattr(photo_config, 'cropY', 0.0)
    max_left = max(0, new_w - TARGET_W)
    max_top  = max(0, new_h - TARGET_H)
    left = int(max_left * (0.5 + crop_x))
    top  = int(max_top  * (0.5 + crop_y))
    left = max(0, min(max_left, left))
    top  = max(0, min(max_top,  top))
    img = img.crop((left, top, left + TARGET_W, top + TARGET_H))

    # テキスト合成（RGBAで透明度を正確に処理）
    texts = getattr(photo_config, 'texts', [])
    if texts:
        img_rgba = img.convert("RGBA")
        text_layer = Image.new("RGBA", img_rgba.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(text_layer)
        for text_overlay in texts:
            draw_text_overlay(draw, text_overlay, TARGET_W, TARGET_H)
        img = Image.alpha_composite(img_rgba, text_layer).convert("RGB")

    return img


def draw_text_overlay(draw: ImageDraw.Draw, overlay, width: int, height: int):
    """テキストオーバーレイを描画"""
    text = overlay.text
    if not text:
        return

    font_size = int(overlay.fontSize * (width / 1080))
    font = load_font(font_size, bold=overlay.bold)

    x = int(overlay.x * width)
    y = int(overlay.y * height)

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    draw_x = x - text_w // 2
    draw_y = y - text_h // 2

    use_bg = getattr(overlay, 'background', False)

    # 半透明背景ボックス
    if use_bg:
        bg_opacity = getattr(overlay, 'bgOpacity', 0.6)
        pad_x = max(10, font_size // 5)
        pad_y = max(6, font_size // 8)
        bg_alpha = int(bg_opacity * 255)
        draw.rectangle(
            [draw_x - pad_x, draw_y - pad_y,
             draw_x + text_w + pad_x, draw_y + text_h + pad_y],
            fill=(0, 0, 0, bg_alpha)
        )

    # 影（背景なし時のみ）
    if overlay.shadow and not use_bg:
        shadow_offset = max(2, font_size // 20)
        draw.text((draw_x + shadow_offset, draw_y + shadow_offset),
                  text, font=font, fill=(0, 0, 0, 180))

    # メインテキスト
    r, g, b = hex_to_rgb(overlay.color)
    draw.text((draw_x, draw_y), text, font=font, fill=(r, g, b, 255))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """日本語対応フォントを読み込む"""
    font_candidates = [
        # Windows
        r"C:\Windows\Fonts\msgothic.ttc",
        r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\YuGothM.ttc",
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\NotoSansCJKjp-Regular.otf",
        # Linux
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
        "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
        "/usr/share/fonts/truetype/takao-gothic/TakaoGothic.ttf",
        # Mac
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    return ImageFont.load_default()


def hex_to_rgb(hex_color: str) -> tuple:
    """#RRGGBB → (R, G, B)"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


async def run_ffmpeg(concat_file: Path, music_path: Path | None, output_path: Path):
    """FFmpegを実行して動画を生成"""

    concat_str = str(concat_file)
    output_str = str(output_path)

    if music_path:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_str,
            "-i", str(music_path),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-r", "30",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-af", "afade=t=out:st=0:d=2",
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            output_str,
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_str,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-r", "30",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            output_str,
        ]

    # asyncio.create_subprocess_exec はWindowsのSelectorEventLoopで動作しないため
    # subprocess.run をスレッド内で実行する
    result = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"FFmpegエラー:\n{result.stderr.decode('utf-8', errors='replace')}")
