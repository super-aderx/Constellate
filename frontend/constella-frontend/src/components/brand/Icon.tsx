import type { SVGProps } from "react"
import { cn } from "@/lib/utils"

/**
 * Constella's outline icons for product concepts: 24px grid, 1.75px strokes, currentColor.
 * Generic UI glyphs (chevrons, check, close) come from lucide-react.
 * Each shape is "kind:args": rect x,y,w,h · circle cx,cy,r · dot cx,cy,r (filled) · path d.
 */
const ICONS = {
  network: ["path:M6.5 17.5 L10 7 M11.8 6.8 L17 11 M8 18 L17 13", "circle:6,19,2", "circle:10.5,5.5,2", "circle:18.5,12,2.5"],
  communities: ["circle:9,10,5.5", "circle:16,15,5.5", "dot:8,9,0.9", "dot:17,16,0.9"],
  centrality: ["circle:12,12,3", "path:M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"],
  products: ["path:M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z", "path:M4 8 L12 12 L20 8 M12 12 V20"],
  lift: ["path:M5 19 L5 5 M5 19 L19 19", "path:M8 15 L12 11 L14.5 13.5 L19 8", "path:M15.5 8H19v3.5"],
  tag: ["path:M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0Z", "dot:8,8,1.3"],
  pen: ["path:M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20Z", "path:M13.5 7l3.5 3.5"],
} as const

export type IconName = keyof typeof ICONS

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  /** px; 20 for navigation, 16 inside controls */
  size?: number
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      {ICONS[name].map((shape, i) => {
        const [kind, args] = shape.split(":")
        const a = args.split(",").map(Number)
        if (kind === "rect") return <rect key={i} x={a[0]} y={a[1]} width={a[2]} height={a[3]} rx={1.5} />
        if (kind === "circle") return <circle key={i} cx={a[0]} cy={a[1]} r={a[2]} />
        if (kind === "dot") return <circle key={i} cx={a[0]} cy={a[1]} r={a[2]} fill="currentColor" />
        return <path key={i} d={args} />
      })}
    </svg>
  )
}
