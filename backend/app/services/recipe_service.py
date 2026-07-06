import httpx
from app.services.gemini_service import generate_recipe_from_ingredients

MEALDB_FILTER_URL = "https://www.themealdb.com/api/json/v1/1/filter.php"
MEALDB_LOOKUP_URL = "https://www.themealdb.com/api/json/v1/1/lookup.php"

MIN_MATCH_SCORE = 1  # minimum overlapping ingredients to count as a real match
CANDIDATE_POOL_SIZE = 20  # how many ranked meals to consider before filtering trims it down

# Best-effort non-veg signal: TheMealDB has no diet field, so we scan each
# candidate's actual ingredient list for these. Eggs/honey are treated as
# vegetarian-compatible (common convention); adjust here if you want stricter.
NON_VEG_KEYWORDS = {
    "chicken", "beef", "pork", "bacon", "ham", "sausage", "mutton", "lamb",
    "goat", "veal", "turkey", "duck", "rabbit", "venison", "oxtail",
    "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine",
    "shrimp", "prawn", "crab", "lobster", "squid", "octopus", "mussel",
    "clam", "oyster", "scallop", "gelatin", "lard", "meat",
}

# Heuristic thresholds for "quick" vs "involved" — no real prep-time data
# exists in TheMealDB's free tier, so this proxies off recipe complexity.
QUICK_MAX_INGREDIENTS = 8
QUICK_MAX_STEPS = 6


async def _search_by_ingredient(client: httpx.AsyncClient, ingredient: str) -> list[dict]:
    resp = await client.get(MEALDB_FILTER_URL, params={"i": ingredient})
    resp.raise_for_status()
    data = resp.json()
    return data.get("meals") or []


async def _search_by_cuisine(client: httpx.AsyncClient, cuisine: str) -> set[str]:
    resp = await client.get(MEALDB_FILTER_URL, params={"a": cuisine})
    resp.raise_for_status()
    data = resp.json()
    meals = data.get("meals") or []
    return {m["idMeal"] for m in meals}


async def _lookup_full_recipe(client: httpx.AsyncClient, meal_id: str) -> dict | None:
    resp = await client.get(MEALDB_LOOKUP_URL, params={"i": meal_id})
    resp.raise_for_status()
    data = resp.json()
    meals = data.get("meals")
    return meals[0] if meals else None


def _extract_instructions(meal: dict) -> str:
    return meal.get("strInstructions", "").strip()


def _full_ingredient_list(meal: dict) -> list[str]:
    """TheMealDB spreads ingredients across strIngredient1..20 fields."""
    names = []
    for i in range(1, 21):
        val = (meal.get(f"strIngredient{i}") or "").strip()
        if val:
            names.append(val.lower())
    return names


def _is_vegetarian(meal: dict) -> bool:
    ingredient_text = " ".join(_full_ingredient_list(meal))
    return not any(keyword in ingredient_text for keyword in NON_VEG_KEYWORDS)


def _time_category(meal: dict) -> str:
    ingredient_count = len(_full_ingredient_list(meal))
    instructions = _extract_instructions(meal)
    # Instructions are usually newline- or period-separated steps.
    steps = [s for s in instructions.replace("\r\n", "\n").split("\n") if s.strip()]
    if len(steps) <= 1:
        steps = [s for s in instructions.split(". ") if s.strip()]

    if ingredient_count <= QUICK_MAX_INGREDIENTS and len(steps) <= QUICK_MAX_STEPS:
        return "quick"
    return "involved"


def _passes_filters(meal: dict, diet: str, time: str) -> bool:
    if diet == "veg" and not _is_vegetarian(meal):
        return False
    if diet == "non_veg" and _is_vegetarian(meal):
        return False
    if time != "any" and _time_category(meal) != time:
        return False
    return True


async def get_recipes(
    ingredients: list[str],
    max_results: int = 5,
    cuisine: str | None = None,
    diet: str = "any",
    time: str = "any",
) -> list[dict]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        # 1. Search TheMealDB per ingredient, tally how often each meal shows up
        meal_scores: dict[str, int] = {}
        meal_names: dict[str, str] = {}
        meal_thumbs: dict[str, str] = {}

        for ing in ingredients:
            try:
                meals = await _search_by_ingredient(client, ing)
            except httpx.HTTPError:
                continue
            for meal in meals:
                mid = meal["idMeal"]
                meal_scores[mid] = meal_scores.get(mid, 0) + 1
                meal_names[mid] = meal["strMeal"]
                meal_thumbs[mid] = meal.get("strMealThumb")

        # 2. Cuisine filter is cheap (one extra call, no per-meal lookup needed)
        #    so apply it before ranking/trimming.
        if cuisine:
            try:
                allowed_ids = await _search_by_cuisine(client, cuisine)
            except httpx.HTTPError:
                allowed_ids = set()
            meal_scores = {mid: score for mid, score in meal_scores.items() if mid in allowed_ids}

        ranked = sorted(meal_scores.items(), key=lambda x: x[1], reverse=True)
        ranked = [m for m in ranked if m[1] >= MIN_MATCH_SCORE]
        had_ingredient_matches = bool(ranked)

        # Keep a wider candidate pool than max_results, since diet/time
        # filtering happens after fetching full recipes and will trim some out.
        candidates = ranked[:CANDIDATE_POOL_SIZE]

        results = []
        for meal_id, score in candidates:
            if len(results) >= max_results:
                break
            full = await _lookup_full_recipe(client, meal_id)
            if not full:
                continue
            if not _passes_filters(full, diet, time):
                continue
            results.append({
                "id": meal_id,
                "title": meal_names[meal_id],
                "image": meal_thumbs[meal_id],
                "matched_ingredients": ingredients[:score],
                "instructions": _extract_instructions(full),
                "source": "themealdb",
                "cuisine": full.get("strArea"),
                "is_vegetarian": _is_vegetarian(full),
                "time_category": _time_category(full),
            })

        # 3. Fallback to Gemini only when ingredient matching itself found
        #    nothing — NOT when filters trimmed away otherwise-valid matches.
        #    In the latter case we return [] so the UI can prompt the user
        #    to relax filters instead of silently ignoring them.
        if not results and not had_ingredient_matches and ingredients:
            generated = await generate_recipe_from_ingredients(
                ingredients, cuisine=cuisine, diet=diet
            )
            results.append({
                "id": "ai-generated-1",
                "title": generated.get("title", "AI Suggested Recipe"),
                "image": None,
                "matched_ingredients": ingredients,
                "instructions": generated.get("instructions", ""),
                "source": "ai_generated",
                "cuisine": cuisine,
                "is_vegetarian": diet == "veg" or None,
                "time_category": time if time != "any" else None,
            })

        return results