// Thin fetch wrappers around the FastAPI backend.
// Field names here match backend/app/models/schemas.py exactly:
//   POST /detect   body: { image_base64: "<base64, no data-URL prefix>" }
//                  resp: { ingredients: ["tomato", "onion", ...] }
//   POST /recipes  body: { ingredients: [...], cuisine, diet, time }
//                  resp: { recipes: [{ id, title, image, matched_ingredients,
//                            instructions, source, cuisine, is_vegetarian,
//                            time_category }] }
//                  source is "themealdb" or "ai_generated"
//                  diet is "any" | "veg" | "non_veg"
//                  time is "any" | "quick" | "involved"

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://khushie24-recipe-api.hf.space').replace(/\/$/, '')

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function postJson(path, body) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    // Render free tier cold-starts after ~15 min idle — first request can
    // take 30-50s or, on flaky networks, fail outright. Surface that.
    throw new ApiError(
      'Could not reach the server. If it has been idle a while, it may be waking up — try again in about 30 seconds.',
      0
    )
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const detail = data?.detail || data?.message || `Request failed (${res.status})`
    throw new ApiError(detail, res.status)
  }

  return data
}

/** Strip the "data:image/jpeg;base64," prefix a canvas dataURL includes. */
function stripDataUrlPrefix(dataUrl) {
  const commaIndex = dataUrl.indexOf(',')
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
}

/**
 * @param {string} imageDataUrl - canvas.toDataURL('image/jpeg') output
 * @returns {Promise<string[]>} detected ingredient names
 */
export async function detectIngredients(imageDataUrl) {
  const image_base64 = stripDataUrlPrefix(imageDataUrl)
  const data = await postJson('/detect', { image_base64 })
  return data.ingredients ?? []
}

/**
 * @param {string[]} ingredients
 * @param {object} [filters]
 * @param {string|null} [filters.cuisine] - TheMealDB Area value, e.g. "Indian"
 * @param {'any'|'veg'|'non_veg'} [filters.diet]
 * @param {'any'|'quick'|'involved'} [filters.time]
 * @returns {Promise<object[]>} recipe objects
 */
export async function getRecipes(ingredients, filters = {}) {
  const { cuisine = null, diet = 'any', time = 'any' } = filters
  const data = await postJson('/recipes', { ingredients, cuisine, diet, time })
  return data.recipes ?? []
}

export { ApiError }