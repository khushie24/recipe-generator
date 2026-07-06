import { useState } from 'react'

export default function RecipeCard({ recipe, requestedCount }) {
  const [expanded, setExpanded] = useState(false)
  const {
    title,
    image,
    source, // "themealdb" | "ai_generated"
    matched_ingredients: matched = [],
    instructions,
    cuisine,
    is_vegetarian: isVegetarian,
    time_category: timeCategory
  } = recipe

  const isAi = source === 'ai_generated'

  return (
    <article className="recipe-card">
      <div className="recipe-card-media">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="recipe-card-media-fallback" aria-hidden="true">
            🍲
          </div>
        )}
        <span className={`recipe-badge recipe-badge-${isAi ? 'ai' : 'db'}`}>
          {isAi ? 'AI recipe' : 'TheMealDB'}
        </span>
      </div>

      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{title}</h3>

        <div className="recipe-card-tags">
          {cuisine && <span className="tag">{cuisine}</span>}
          {isVegetarian === true && <span className="tag tag-veg">Vegetarian</span>}
          {isVegetarian === false && <span className="tag tag-nonveg">Non-veg</span>}
          {timeCategory && (
            <span className="tag">{timeCategory === 'quick' ? 'Quick' : 'Involved'}</span>
          )}
        </div>

        {matched.length > 0 && (
          <p className="recipe-card-match">
            Uses {matched.length}
            {requestedCount ? ` of your ${requestedCount}` : ''} scanned ingredient
            {matched.length === 1 ? '' : 's'}
          </p>
        )}

        {matched.length > 0 && (
          <div className="recipe-card-missing">
            {matched.map((ing) => (
              <span key={ing} className="chip chip-muted">
                <span className="chip-label">{ing}</span>
              </span>
            ))}
          </div>
        )}

        {instructions && (
          <>
            <button
              type="button"
              className="recipe-card-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Hide instructions' : 'Show instructions'}
            </button>
            {expanded && <p className="recipe-card-instructions">{instructions}</p>}
          </>
        )}
      </div>
    </article>
  )
}