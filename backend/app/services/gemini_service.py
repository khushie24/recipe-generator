import asyncio
import json
import re

import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

DETECT_PROMPT = (
    "Look at this image and identify only the raw/whole food ingredients "
    "visible (vegetables, fruits, grains, spices, dairy, meat, etc). "
    "Ignore packaging, utensils, and non-food items. "
    "Respond with ONLY a JSON array of lowercase ingredient names, "
    "nothing else. Example: [\"tomato\", \"onion\", \"garlic\"]. "
    "If nothing edible is visible, respond with []."
)

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 2  # doubles each retry: 2s, 4s, 8s


class GeminiRateLimitError(Exception):
    """Raised when Gemini keeps returning 429 after all retries are exhausted."""


def _extract_json_array(text: str) -> list:
    """Gemini sometimes wraps JSON in markdown fences — strip those."""
    cleaned = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        return []
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return []


def _extract_json_object(text: str) -> dict | None:
    cleaned = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


async def _call_gemini(payload: dict) -> dict:
    """
    POST to the Gemini API with retry-on-429 (exponential backoff).
    Raises GeminiRateLimitError if all retries are exhausted, or re-raises
    the underlying httpx.HTTPStatusError for any other non-2xx response.
    """
    last_error: httpx.HTTPStatusError | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(MAX_RETRIES):
            resp = await client.post(GEMINI_URL, json=payload)

            if resp.status_code == 429:
                last_error = httpx.HTTPStatusError(
                    "Gemini rate limit (429)", request=resp.request, response=resp
                )
                if attempt < MAX_RETRIES - 1:
                    wait = BASE_BACKOFF_SECONDS * (2 ** attempt)
                    await asyncio.sleep(wait)
                    continue
                raise GeminiRateLimitError(
                    "Gemini API rate limit exceeded after retries. "
                    "If this keeps happening, you're hitting the free-tier "
                    "requests-per-minute or requests-per-day cap — wait a bit "
                    "or check your quota in Google AI Studio."
                ) from last_error

            resp.raise_for_status()
            return resp.json()

    # Unreachable in practice, but keeps type-checkers happy.
    raise GeminiRateLimitError("Gemini API rate limit exceeded after retries.")


async def detect_ingredients(image_base64: str) -> list[str]:
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": DETECT_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64,
                        }
                    },
                ]
            }
        ]
    }

    data = await _call_gemini(payload)

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return []

    ingredients = _extract_json_array(text)
    return [str(i).strip().lower() for i in ingredients if str(i).strip()]


async def generate_recipe_from_ingredients(
    ingredients: list[str],
    cuisine: str | None = None,
    diet: str = "any",
) -> dict:
    """Fallback when TheMealDB has no good match."""
    fallback = {
        "title": "Simple stir-fry",
        "instructions": "Combine and cook ingredients with oil and salt to taste.",
    }

    constraints = []
    if cuisine:
        constraints.append(f"in the style of {cuisine} cuisine")
    if diet == "veg":
        constraints.append("strictly vegetarian, no meat/poultry/fish/seafood")
    elif diet == "non_veg":
        constraints.append("include meat, poultry, or seafood as a main ingredient")
    constraint_text = f" The recipe must be {', and '.join(constraints)}." if constraints else ""

    prompt = (
        f"Create one simple recipe using mainly these ingredients: "
        f"{', '.join(ingredients)}. Common pantry staples (salt, oil, water) "
        f"are fine to add.{constraint_text} Respond with ONLY JSON in this "
        f'exact shape: {{"title": "...", "instructions": "step by step, numbered"}}. '
        f"No markdown, no extra text."
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    data = await _call_gemini(payload)

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return fallback

    return _extract_json_object(text) or fallback