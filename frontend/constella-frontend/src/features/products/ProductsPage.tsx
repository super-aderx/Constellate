import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { Dialog } from "radix-ui"
import { SelectField } from "@/components/controls/SelectField"
import { Button } from "@/components/ui/button"
import { categories, productById, products, storeInfo } from "@/data/store"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { detail as detailCopy, page, toolbar, table as tableCopy } from "./content"
import { rowById, rows } from "./model"
import { PairHeatMap } from "./PairHeatMap"
import { ProductDetail } from "./ProductDetail"
import { ProductTable } from "./ProductTable"

/**
 * Products: a sortable table with each product's 12-week trend; the selected product's details sit
 * beside it on wide screens and open as a sheet on narrow ones. Below, the store's pairs as a heat map.
 */
export function ProductsPage({ params }: { params: URLSearchParams }) {
  const wide = useMediaQuery("(min-width: 1024px)")
  const fromLink = params.get("product")
  const [selected, setSelected] = useState<string | null>(() =>
    fromLink && productById[fromLink] ? fromLink : window.matchMedia("(min-width: 1024px)").matches ? "coffee" : null,
  )
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")

  const q = query.trim().toLowerCase()
  const shown = rows.filter(
    (r) => (category === "all" || r.product.category === category) && (!q || r.product.label.toLowerCase().includes(q)),
  )
  const row = selected ? rowById[selected] : null

  return (
    <div className="mx-auto max-w-[88rem] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header>
        <h1 className="text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em]">{page.title}</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-6 text-ink-muted md:text-base">{page.summary(storeInfo.name, products.length)}</p>
      </header>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-6">
        <section aria-label={page.title} className="min-w-0 rounded-xl bg-surface-raised p-3 md:p-4">
          <div className="flex flex-wrap items-end gap-3 px-1 pb-4">
            <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
              <span className="sr-only">{toolbar.search}</span>
              <span className="flex h-9 items-center gap-2 rounded-t-md bg-field px-3 shadow-[inset_0_-1px_0_var(--line-strong)] focus-within:shadow-[inset_0_-2px_0_var(--focus)]">
                <SearchIcon aria-hidden className="size-4 text-ink-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={toolbar.search}
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-faint focus-visible:outline-none"
                />
              </span>
            </label>
            <SelectField
              label={toolbar.category}
              hideLabel
              className="w-44 max-sm:flex-1"
              value={category}
              onValueChange={setCategory}
              options={[{ value: "all", label: toolbar.allCategories }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
            <p className="ml-auto self-center text-[13px] text-ink-muted tabular-nums" aria-live="polite">
              {toolbar.count(shown.length, rows.length)}
            </p>
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p className="max-w-[40ch] text-[15px] text-ink-muted">{tableCopy.empty}</p>
              <Button
                variant="secondary"
                className="h-9 rounded-xl px-4"
                onClick={() => {
                  setQuery("")
                  setCategory("all")
                }}
              >
                {tableCopy.clear}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ProductTable rows={shown} selected={selected} onSelect={setSelected} />
            </div>
          )}
        </section>

        {wide && (
          <aside aria-label={row?.product.label ?? detailCopy.empty} className="sticky top-6 rounded-xl bg-surface-raised p-5 md:p-6">
            {row ? <ProductDetail key={row.product.id} row={row} /> : <p className="py-10 text-center text-[15px] text-ink-muted">{detailCopy.empty}</p>}
          </aside>
        )}
      </div>

      {!wide && (
        <Dialog.Root open={row != null} onOpenChange={(open) => !open && setSelected(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-sky/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-surface-raised p-5 shadow-pop data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none"
            >
              <Dialog.Title className="sr-only">{row?.product.label}</Dialog.Title>
              <Dialog.Close
                aria-label={detailCopy.close}
                className="absolute top-4 right-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-xl text-ink-muted hover:bg-field hover:text-ink"
              >
                <XIcon className="size-5" />
              </Dialog.Close>
              {row && <ProductDetail key={row.product.id} row={row} />}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <div className="mt-6">
        <PairHeatMap highlight={selected} />
      </div>
    </div>
  )
}
