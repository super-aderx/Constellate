import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/**
 * Page section with the shared gutter and max width.
 * Vertical spacing is left to the caller (className), so it never fights a default.
 */
export function Section({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("scroll-mt-16 px-4 md:px-10", className)} {...props}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}
