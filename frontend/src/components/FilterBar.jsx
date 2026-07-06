// Cuisine values match TheMealDB's Area field exactly (filter.php?a=<value>) —
// keep this list to real Area values or the backend cuisine filter will
// silently return zero matches for anything typed free-form.
const CUISINES = [
  'American', 'British', 'Chinese', 'French', 'Greek', 'Indian',
  'Italian', 'Japanese', 'Jamaican', 'Mexican', 'Moroccan', 'Spanish',
  'Thai', 'Turkish', 'Vietnamese'
]

const DIET_OPTIONS = [
  { value: 'any', label: 'Any diet' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-vegetarian' }
]

const TIME_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'quick', label: 'Quick' },
  { value: 'involved', label: 'Involved' }
]

export default function FilterBar({ filters, onChange }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="filter-bar">
      <select
        className="filter-select"
        value={filters.cuisine ?? ''}
        onChange={(e) => update('cuisine', e.target.value || null)}
        aria-label="Cuisine"
      >
        <option value="">Any cuisine</option>
        {CUISINES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.diet}
        onChange={(e) => update('diet', e.target.value)}
        aria-label="Diet"
      >
        {DIET_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.time}
        onChange={(e) => update('time', e.target.value)}
        aria-label="Time"
      >
        {TIME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}