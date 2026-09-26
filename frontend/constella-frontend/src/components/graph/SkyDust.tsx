import { cn } from "@/lib/utils"

/** Two layers of faint background stars; the nearer one moves further, which reads as depth. */
const LAYERS = [
  { count: 80, minR: 0.5, maxR: 1, opacity: 0.25, depth: -10 },
  { count: 28, minR: 0.9, maxR: 1.6, opacity: 0.45, depth: -24 },
]

/** Small seeded generator, so the sky is the same on every load. */
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const STARS = LAYERS.map((layer, i) => {
  const rand = seeded(7919 * (i + 1))
  return Array.from({ length: layer.count }, () => ({
    x: rand() * 640,
    y: rand() * 420,
    r: layer.minR + rand() * (layer.maxR - layer.minR),
  }))
})

/**
 * Decorative backdrop for the graph. Reads the parent's --px / --py (−1…1, pointer position)
 * to shift each layer; without them it stays still.
 */
export function SkyDust({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {LAYERS.map((layer, i) => (
        <svg
          key={i}
          viewBox="0 0 640 420"
          preserveAspectRatio="xMidYMid slice"
          className="absolute -top-8 -left-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] transition-transform duration-700 ease-out"
          style={{
            transform: `translate3d(calc(var(--px, 0) * ${layer.depth}px), calc(var(--py, 0) * ${layer.depth}px), 0)`,
          }}
        >
          {STARS[i].map((s, j) => (
            <circle key={j} cx={s.x} cy={s.y} r={s.r} fill="var(--ink)" opacity={layer.opacity} />
          ))}
        </svg>
      ))}
    </div>
  )
}
