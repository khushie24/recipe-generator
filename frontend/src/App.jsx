import { useState } from 'react'
import ScanScreen from './screens/ScanScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'

export default function App() {
  const [ingredients, setIngredients] = useState(null) // null = still on scan screen

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-title">
          <span className="dot" aria-hidden="true" />
          Ingredient Scanner
        </p>
        <span className="app-tag">{ingredients ? 'results' : 'scan'}</span>
      </header>

      {!ingredients ? (
        <ScanScreen onDetected={setIngredients} />
      ) : (
        <ResultsScreen ingredients={ingredients} onRescan={() => setIngredients(null)} />
      )}
    </div>
  )
}