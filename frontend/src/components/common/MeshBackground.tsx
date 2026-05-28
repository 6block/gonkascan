/**
 * Page-fixed animated mesh-style background.
 *
 * Implemented purely with CSS multi-stop radial gradients drifting via
 * `transform`/`scale` on the compositor — no WebGL fragment shader, no paint,
 * no layout. Costs ~5% of the GPU budget the previous shader needed, while
 * still giving the "color clouds slowly flow" feel.
 *
 * The actual visual lives in `.mesh-bg` (see index.css); this component just
 * mounts the two layers so they can be removed cleanly if needed.
 */
export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="mesh-bg pointer-events-none"
    />
  )
}
