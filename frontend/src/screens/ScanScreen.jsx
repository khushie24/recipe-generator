import { useState } from 'react'
import CameraView from '../components/CameraView.jsx'
import Loader from '../components/Loader.jsx'
import { detectIngredients, ApiError } from '../services/api.js'

export default function ScanScreen({ onDetected }) {
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(null)

  async function handleCapture(imageDataUrl) {
    setDetecting(true)
    setError(null)
    try {
      const ingredients = await detectIngredients(imageDataUrl)
      if (ingredients.length === 0) {
        setError("Didn't recognize any ingredients in that shot. Try moving closer or improving the light.")
        setDetecting(false)
        return
      }
      onDetected(ingredients)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong scanning that image.')
      setDetecting(false)
    }
  }

  if (detecting) {
    return (
      <div className="screen screen-center">
        <Loader label="Identifying ingredients…" />
      </div>
    )
  }

  return (
    <div className="screen screen-camera">
      <CameraView onCapture={handleCapture} disabled={detecting} />
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
