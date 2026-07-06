from fastapi import APIRouter, HTTPException
from app.models.schemas import RecipeRequest, RecipeResponse
from app.services.recipe_service import get_recipes

router = APIRouter()


@router.post("/recipes", response_model=RecipeResponse)
async def recipes(payload: RecipeRequest):
    if not payload.ingredients:
        raise HTTPException(status_code=400, detail="ingredients list is required")
    try:
        results = await get_recipes(
            payload.ingredients,
            cuisine=payload.cuisine,
            diet=payload.diet,
            time=payload.time,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Recipe lookup failed: {e}")
    return RecipeResponse(recipes=results)