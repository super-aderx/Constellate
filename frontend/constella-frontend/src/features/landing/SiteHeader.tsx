import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { useScrolled } from "@/hooks/useScrolled"
import { cn } from "@/lib/utils"
import { nav, requestAccess } from "./content"
import { buttonShape } from "./styles"

/** Sticky; turns into a frosted layer once the page scrolls under it. */
export function SiteHeader() {
  const scrolled = useScrolled()

  return (
    <header
      className={cn(
        "sticky top-0 z-40 px-4 transition-[background-color,box-shadow,backdrop-filter] duration-300 md:px-10",
        scrolled && "bg-surface/75 shadow-[0_1px_0_var(--line)] backdrop-blur-lg backdrop-saturate-150",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-10">
        <a href="#top" aria-label="Constella, back to top" className="rounded-sm">
          <Logo size={28} />
        </a>
        <nav aria-label="Main" className="hidden gap-7 md:flex">
          {nav.map((link) => (
            <a key={link.href} href={link.href} className="rounded-sm text-[15px] font-medium text-ink-muted hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>
        <Button asChild className={cn("ml-auto", buttonShape)}>
          <a href={requestAccess.href}>{requestAccess.label}</a>
        </Button>
      </div>
    </header>
  )
}
