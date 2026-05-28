import { useEffect, useState } from 'react'

interface UseScrolledResult {
  scrolled: boolean
}

/**
 * Tracks vertical scroll.
 *
 * Returns only the boolean `scrolled` (toggles once per threshold crossing).
 * Continuous scroll progress is written to the `--scroll-progress` CSS variable
 * on <html> so it can drive transforms/opacity via CSS calc() without causing
 * React re-renders on every scroll frame.
 */
export function useScrolled(threshold = 12, rampDistance = 120): UseScrolledResult {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastScrolled = scrolled
    const root = document.documentElement

    const update = () => {
      const y = window.scrollY
      const next = y > threshold
      const progress = Math.min(1, Math.max(0, y / rampDistance))
      root.style.setProperty('--scroll-progress', progress.toFixed(3))
      if (next !== lastScrolled) {
        lastScrolled = next
        setScrolled(next)
      }
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold, rampDistance])

  return { scrolled }
}
