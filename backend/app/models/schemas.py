from pydantic import BaseModel
from typing import List, Optional, Literal


class DetectRequest(BaseModel):
    image_base64: str  # raw base64 string, no "data:image/..." prefix


class DetectResponse(BaseModel):
    ingredients: List[str]


class RecipeRequest(BaseModel):
    ingredients: List[str]
    cuisine: Optional[str] = None  # TheMealDB Area value, e.g. "Indian", "Italian"
    diet: Literal["any", "veg", "non_veg"] = "any"
    time: Literal["any", "quick", "involved"] = "any"


class Recipe(BaseModel):
    id: str
    title: str
    image: Optional[str] = None
    matched_ingredients: List[str]
    instructions: str
    source: str  # "themealdb" or "ai_generated"
    cuisine: Optional[str] = None
    is_vegetarian: Optional[bool] = None
    time_category: Optional[str] = None  # "quick" or "involved"


class RecipeResponse(BaseModel):
    recipes: List[Recipe]