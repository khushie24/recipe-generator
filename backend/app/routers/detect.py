from fastapi import APIRouter, HTTPException
from app.models.schemas import DetectRequest, DetectResponse
from app.services.gemini_service import detect_ingredients

router = APIRouter()


@router.post("/detect", response_model=DetectResponse)
async def detect(payload: DetectRequest):
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")
    try:
        ingredients = await detect_ingredients(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Detection failed: {e}")
    return DetectResponse(ingredients=ingredients)
