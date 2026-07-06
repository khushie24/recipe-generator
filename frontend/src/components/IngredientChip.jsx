export default function IngredientChip({ name, onRemove }) {
  return (
    <span className="chip">
      <span className="chip-label">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="chip-remove"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
