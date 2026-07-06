import { useState } from 'react'
import IngredientChip from '../components/IngredientChip.jsx'
import RecipeCard from '../components/RecipeCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import Loader from '../components/Loader.jsx'
import { getRecipes, ApiError } from '../services/api.js'

export default function ResultsScreen({ ingredients, onRescan }) {
  const [list, setList] = useState(ingredients)
  const [filters, setFilters] = useState({ cuisine: null, diet: 'any', time: 'any' })
  const [recipes, setRecipes] = useState(null)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [error, setError] = useState(null)

  const hasActiveFilters = filters.cuisine || filters.diet !== 'any' || filters.time !== 'any'

  function removeIngredient(name) {
    setList((prev) => prev.filter((i) => i !== name))
    setRecipes(null) // stale once the ingredient set changes
  }

  function handleFilterChange(next) {
    setFilters(next)
    setRecipes(null) // stale once filters change
  }

  async function handleFindRecipes() {
    if (list.length === 0) return
    setLoadingRecipes(true)
    setError(null)
    try {
      const results = await getRecipes(list, filters)
      setRecipes(results)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load recipes right now.')
    } finally {
      setLoadingRecipes(false)
    }
  }

  return (
    <div className="screen screen-results">
      <section className="results-section">
        <div className="results-section-header">
          <h2>Detected ingredients</h2>
          <button type="button" className="text-button" onClick={onRescan}>
            Scan again
          </button>
        </div>

        {list.length === 0 ? (
          <p className="empty-hint">
            You removed everything from the list. Scan again or nothing to cook with here.
          </p>
        ) : (
          <div className="chip-row">
            {list.map((name) => (
              <IngredientChip key={name} name={name} onRemove={() => removeIngredient(name)} />
            ))}
          </div>
        )}

        <FilterBar filters={filters} onChange={handleFilterChange} />

        <button
          type="button"
          className="primary-button"
          onClick={handleFindRecipes}
          disabled={list.length === 0 || loadingRecipes}
        >
          {loadingRecipes ? 'Finding recipes…' : 'Find recipes'}
        </button>

        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
      </section>

      <section className="results-section">
        {loadingRecipes && <Loader label="Matching recipes…" />}

        {!loadingRecipes && recipes && recipes.length === 0 && (
          <p className="empty-hint">
            No recipes matched{hasActiveFilters ? ' these filters' : ''}.{' '}
            {hasActiveFilters
              ? 'Try loosening a filter, or remove one to widen the search.'
              : 'Try removing an ingredient or two.'}
          </p>
        )}

        {!loadingRecipes && recipes && recipes.length > 0 && (
          <div className="recipe-list">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id ?? recipe.title}
                recipe={recipe}
                requestedCount={list.length}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}