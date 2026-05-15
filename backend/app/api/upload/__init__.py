import os
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.core.deps import get_current_user
from app.models.usuario import Usuario

router = APIRouter()

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Solo se permiten imágenes (jpg, png, gif, webp)")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "El archivo no puede superar 5 MB")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"

    filename = f"{uuid.uuid4().hex}.{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    with open(UPLOAD_DIR / filename, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/{filename}"}
