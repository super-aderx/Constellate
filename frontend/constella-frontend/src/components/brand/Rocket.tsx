import { cn } from "@/lib/utils"

interface RocketGlyphProps {
  /** px */
  height?: number
  /** Colour of the window; match the surface behind it. */
  porthole?: string
  className?: string
}

/** The rocket alone, pointing right, in currentColor with a peach flame. For markers and inline use. */
export function RocketGlyph({ height = 16, porthole = "var(--surface-raised)", className }: RocketGlyphProps) {
  return (
    <svg viewBox="-86 -7 88 54" height={height} width={(height * 88) / 54} aria-hidden className={cn("block shrink-0", className)}>
      <g transform="rotate(90)">
        <path d="M11 62 Q20 86 29 62 Z" fill="var(--star)" />
        <path d="M6 44 L-5 58 L-5 70 L6 62 Z M34 44 L45 58 L45 70 L34 62 Z" fill="var(--star)" />
        <path d="M20 0 C31 9 34 26 34 44 L34 62 Q34 66 30 66 L10 66 Q6 66 6 62 L6 44 C6 26 9 9 20 0 Z" fill="currentColor" />
        <circle cx={20} cy={30} r={7} fill={porthole} />
      </g>
    </svg>
  )
}

interface RocketProps {
  /** px */
  size?: number
  /** On an action fill, such as the call-to-action band. */
  inverse?: boolean
  className?: string
}

/**
 * The growth motif: a flat rocket at the end of a short constellation line.
 * Launch moments only (landing CTA, onboarding), never inside data views. One per screen.
 */
export function Rocket({ size = 96, inverse = false, className }: RocketProps) {
  const body = inverse ? "var(--on-action)" : "var(--action)"
  const porthole = inverse ? "var(--action)" : "var(--surface-raised)"
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden className={cn("block shrink-0", className)}>
      <path d="M12 186 L36 150 L60 140 L117 83" fill="none" stroke={body} strokeOpacity={0.4} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={12} cy={186} r={3.5} fill={body} />
      <circle cx={36} cy={150} r={4.5} fill={body} />
      <circle cx={60} cy={140} r={5.5} fill="var(--star)" />
      <g transform="translate(150 50) rotate(45) translate(-20 -40)">
        <path d="M11 62 Q20 104 29 62 Z" fill="var(--star)" />
        <path d="M6 44 L-5 58 L-5 70 L6 62 Z M34 44 L45 58 L45 70 L34 62 Z" fill="var(--star)" />
        <path d="M20 0 C31 9 34 26 34 44 L34 62 Q34 66 30 66 L10 66 Q6 66 6 62 L6 44 C6 26 9 9 20 0 Z" fill={body} />
        <circle cx={20} cy={30} r={7} fill={porthole} />
      </g>
    </svg>
  )
}
