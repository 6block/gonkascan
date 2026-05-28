import { lazy, Suspense, useEffect, useState } from 'react'

const MeshGradient = lazy(() =>
  import('@paper-design/shaders-react').then((m) => ({ default: m.MeshGradient })),
)

type ConnectionWithSaveData = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionWithSaveData
  deviceMemory?: number
}

/**
 * Decide whether the device can afford the animated WebGL shader.
 *
 * The shader was the main culprit behind "fan spins up / cursor stutters on scroll":
 * a fragment shader rendering ~2M pixels at 60Hz pegs integrated GPUs on most laptops.
 *
 * Defaults to OFF — opt-in only when the device clearly has headroom.
 */
function shouldEnableShader(): boolean {
  if (typeof window === 'undefined') return false

  // 1) Respect user motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

  // 2) Skip narrow viewports (phones / split-screen laptops)
  if (window.innerWidth < 1024) return false

  // 3) Coarse pointer = touch device, almost always integrated GPU
  if (window.matchMedia('(pointer: coarse)').matches) return false

  const nav = navigator as NavigatorWithConnection

  // 4) Honour Data Saver and slow connections
  const conn = nav.connection
  if (conn?.saveData) return false
  if (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) return false

  // 5) Low CPU concurrency or low RAM = likely entry-level hardware
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency < 6) return false
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 8) return false

  return true
}

/**
 * Page-fixed animated mesh-gradient background.
 *
 * Performance strategy:
 *  - Default to OFF for the long tail of devices; opt-in only on clearly capable hardware.
 *  - Pause when the tab is hidden (speed=0 freezes the shader).
 *  - Hard-cap internal canvas to 720p so the GPU doesn't render 2M+ pixels per frame.
 *  - Lazy-load the shader bundle so it isn't shipped in the critical path.
 */
export function MeshBackground() {
  const [enabled, setEnabled] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const decide = () => setEnabled(shouldEnableShader())
    decide()

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqWidth = window.matchMedia('(min-width: 1024px)')
    mqMotion.addEventListener?.('change', decide)
    mqWidth.addEventListener?.('change', decide)
    return () => {
      mqMotion.removeEventListener?.('change', decide)
      mqWidth.removeEventListener?.('change', decide)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [enabled])

  // Static CSS gradient (defined on <body>) is used when the shader is disabled.
  if (!enabled) return null

  const colors = [
    '#0a0e18',
    '#0f1a2e',
    '#0d2a3a',
    '#1a3a52',
    '#1c4d3e',
  ]

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Suspense fallback={null}>
        <MeshGradient
          colors={colors}
          speed={hidden ? 0 : 0.08}
          distortion={0.6}
          swirl={0.2}
          grainMixer={0.03}
          grainOverlay={0.0}
          minPixelRatio={1}
          maxPixelCount={1280 * 720}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </Suspense>
      <div className="absolute inset-0 bg-night-50/40" />
    </div>
  )
}
