import { cn } from "@/lib/utils"

/** The small constellation glyph that marks generated (AI) content. */
export function GenMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden className={cn("shrink-0 text-action", className)}>
      <path d="M3 12 L7 4 L13 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={3} cy={12} r={1.8} fill="currentColor" />
      <circle cx={13} cy={8} r={1.8} fill="currentColor" />
      <circle cx={7} cy={4} r={2.6} fill="var(--star)" />
    </svg>
  )
}
