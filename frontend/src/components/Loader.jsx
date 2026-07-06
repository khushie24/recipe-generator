export default function Loader({ label = 'Working…' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-dots">
        <span />
        <span />
        <span />
      </div>
      <p className="loader-label">{label}</p>
    </div>
  )
}
