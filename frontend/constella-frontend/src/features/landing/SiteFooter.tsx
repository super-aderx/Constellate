import { Logo } from "@/components/brand/Logo"
import { footer, nav } from "./content"

export function SiteFooter() {
  return (
    <footer className="px-4 pt-14 pb-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-xs">
            <Logo size={26} />
            <p className="mt-3 text-[14px] leading-[1.5] text-ink-muted">{footer.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              {nav.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="rounded-sm text-ink-muted hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-[13px] text-ink-muted">{footer.legal}</p>
      </div>
    </footer>
  )
}
