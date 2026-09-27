import { useId, useState, type FormEvent, type ReactNode } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Dialog } from "radix-ui"
import { fieldClass } from "@/components/controls/field"
import { PickList } from "@/components/controls/PickList"
import { communityColor } from "@/components/graph"
import { Button } from "@/components/ui/button"
import { TODAY, type CampaignRecord } from "@/data/campaigns"
import { communityLabel, productById, products } from "@/data/store"
import { cn } from "@/lib/utils"
import { form as copy } from "./content"

export type FormMode = "create" | "edit" | "schedule"

export interface CampaignFields {
  name: string
  offer: string
  products: string[]
  start: string
  end: string
  slogans: string[]
}

interface CampaignFormProps {
  mode: FormMode
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<CampaignRecord>
  onSubmit: (fields: CampaignFields) => void
}

const MAX_PRODUCTS = 3

/** Create, edit or schedule a campaign. Dates are required when scheduling or editing a scheduled campaign. */
export function CampaignForm({ mode, open, onOpenChange, initial, onSubmit }: CampaignFormProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-sky/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[min(34rem,calc(100vw-2rem))] -translate-1/2 overflow-y-auto rounded-2xl bg-surface-raised p-5 text-ink shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none md:p-7"
        >
          {/* Keyed on open so each opening starts from the campaign's current values */}
          {open && <Fields mode={mode} initial={initial} onSubmit={onSubmit} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Fields({ mode, initial, onSubmit }: { mode: FormMode; initial?: Partial<CampaignRecord>; onSubmit: (f: CampaignFields) => void }) {
  const id = useId()
  const [name, setName] = useState(initial?.name ?? "")
  const [offer, setOffer] = useState(initial?.offer ?? "")
  const [picked, setPicked] = useState<string[]>(initial?.products ?? [])
  const [start, setStart] = useState(initial?.start ?? "")
  const [end, setEnd] = useState(initial?.end ?? "")
  const [slogans, setSlogans] = useState((initial?.slogans ?? []).join("\n"))
  const [tried, setTried] = useState(false)

  // Dates are required when scheduling, and stay required when editing a campaign that's already scheduled.
  const needsDates = mode === "schedule" || initial?.status === "scheduled"
  const errors = {
    name: !name.trim() ? copy.errors.name : null,
    offer: !offer.trim() ? copy.errors.offer : null,
    products: picked.length === 0 ? copy.errors.products : null,
    start: needsDates && (!start || start < TODAY) ? copy.errors.past : null,
    end: (needsDates && !end) || (start && end && end <= start) ? copy.errors.dates : null,
  }
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    onSubmit({
      name: name.trim(),
      offer: offer.trim(),
      products: picked,
      start,
      end,
      slogans: slogans.split("\n").map((s) => s.trim()).filter(Boolean),
    })
  }

  const toggle = (pid: string) => setPicked((p) => (p.includes(pid) ? p.filter((x) => x !== pid) : p.length >= MAX_PRODUCTS ? p : [...p, pid]))
  const title = mode === "create" ? copy.createTitle : mode === "schedule" ? copy.scheduleTitle : copy.editTitle

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Dialog.Title className="pr-10 text-[21px] leading-7 font-semibold tracking-[-0.018em]">{title}</Dialog.Title>
      <Dialog.Close
        aria-label={copy.cancel}
        className="absolute top-4 right-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-xl text-ink-muted hover:bg-field hover:text-ink"
      >
        <XIcon className="size-5" />
      </Dialog.Close>

      <Field id={`${id}-name`} label={copy.name} error={show("name")}>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.namePlaceholder} aria-invalid={!!show("name")} aria-describedby={show("name") ? `${id}-name-error` : undefined} className={cn(fieldClass, "h-10")} />
      </Field>

      <Field id={`${id}-offer`} label={copy.offer} error={show("offer")}>
        <input id={`${id}-offer`} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={copy.offerPlaceholder} aria-invalid={!!show("offer")} aria-describedby={show("offer") ? `${id}-offer-error` : undefined} className={cn(fieldClass, "h-10")} />
      </Field>

      <div className="flex flex-col gap-1.5" role="group" aria-labelledby={`${id}-products`} aria-describedby={show("products") ? `${id}-products-error` : undefined}>
        <span id={`${id}-products`} className="text-[13px] font-medium">
          {copy.products}
        </span>
        <span className="text-[12px] leading-4 text-ink-muted">{copy.productsNote}</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {picked.map((pid) => (
            <span key={pid} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-field pr-1 pl-3 text-[13px] font-medium">
              <span aria-hidden className="size-2 rounded-full" style={{ background: communityColor(productById[pid].community) }} />
              {productById[pid].label}
              <button type="button" onClick={() => toggle(pid)} aria-label={copy.remove(productById[pid].label)} className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          <PickList
            items={products.map((p) => ({ id: p.id, label: p.label, group: communityLabel(p.community), color: communityColor(p.community), meta: p.category }))}
            selected={picked}
            onToggle={toggle}
            max={MAX_PRODUCTS}
            labels={{ search: copy.search, empty: copy.pickEmpty, limit: copy.pickLimit }}
            trigger={
              <Button type="button" variant="secondary" className="h-8 rounded-full px-3 text-[13px]">
                <PlusIcon />
                {copy.addProduct}
              </Button>
            }
          />
        </div>
        {show("products") && (
          <p id={`${id}-products-error`} className="text-[13px] text-negative">
            × {show("products")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id={`${id}-start`} label={copy.start} error={show("start")}>
          <input id={`${id}-start`} type="date" min={TODAY} value={start} onChange={(e) => setStart(e.target.value)} aria-invalid={!!show("start")} aria-describedby={show("start") ? `${id}-start-error` : undefined} className={cn(fieldClass, "h-10 tabular-nums")} />
        </Field>
        <Field id={`${id}-end`} label={copy.end} error={show("end")}>
          <input id={`${id}-end`} type="date" min={start || TODAY} value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={!!show("end")} aria-describedby={show("end") ? `${id}-end-error` : undefined} className={cn(fieldClass, "h-10 tabular-nums")} />
        </Field>
      </div>

      <Field id={`${id}-slogans`} label={copy.slogans} note={copy.slogansNote}>
        <textarea id={`${id}-slogans`} rows={3} value={slogans} onChange={(e) => setSlogans(e.target.value)} className={cn(fieldClass, "resize-y py-2 leading-6")} />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Dialog.Close asChild>
          <Button type="button" variant="secondary" className="h-10 rounded-xl px-4">
            {copy.cancel}
          </Button>
        </Dialog.Close>
        <Button type="submit" className="h-10 rounded-xl px-4">
          {mode === "create" ? copy.saveDraft : mode === "schedule" ? copy.scheduleAction : copy.saveChanges}
        </Button>
      </div>
    </form>
  )
}

function Field({ id, label, note, error, children }: { id: string; label: string; note?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {note && <span className="-mt-1 text-[12px] leading-4 text-ink-muted">{note}</span>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-negative">
          × {error}
        </p>
      )}
    </div>
  )
}
