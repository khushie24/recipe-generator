import { useEffect, useRef, useState } from 'react'

/**
 * Live camera preview using getUserMedia. This works both in the browser
 * (npm run dev) and inside the Capacitor webview once camera permission is
 * granted on Android — no native camera plugin required for a *live*
 * viewfinder (the @capacitor/camera plugin instead launches the separate
 * native camera app, which isn't what a live scanner wants).
 *
 * Requires, after `npx cap add android`:
 *   <uses-permission android:name="android.permission.CAMERA" />
 * added to android/app/src/main/AndroidManifest.xml.
 */
export default function CameraView({ onCapture, disabled }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setReady(true)
      } catch (err) {
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Enable it in your device settings to scan ingredients.'
            : 'Could not start the camera on this device.'
        )
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    if (!video || !ready) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // JPEG at 0.85 keeps the base64 payload reasonably small for the
    // Gemini free-tier request size / your Render bandwidth.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    onCapture(dataUrl)
  }

  return (
    <div className="camera-view">
      <video ref={videoRef} className="camera-video" playsInline muted />

      {!error && (
        <div className="camera-viewfinder" aria-hidden="true">
          <span className="vf-corner vf-tl" />
          <span className="vf-corner vf-tr" />
          <span className="vf-corner vf-bl" />
          <span className="vf-corner vf-br" />
        </div>
      )}

      {error && (
        <div className="camera-error">
          <p>{error}</p>
        </div>
      )}

      <div className="camera-controls">
        <p className="camera-hint">
          {ready ? 'Center an ingredient, then scan' : 'Starting camera…'}
        </p>
        <button
          type="button"
          className="scan-button"
          onClick={handleCapture}
          disabled={!ready || disabled}
        >
          <span className="scan-button-ring" />
        </button>
      </div>
    </div>
  )
}
