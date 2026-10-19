import { useState } from "react"
import { AlertDialog } from "radix-ui"
import type { ApiCampaign } from "@/data/api"
import { Button } from "@/components/ui/button"
import { canActivate, canClose } from "./board"
import { board } from "./content"
import { ProposalStatusBadge } from "./ProposalStatusBadge"

const button = "h-10 rounded-xl px-4"

/** One Constella AI proposal: what's on offer, to whom, and what can be done with it next.
 * Close is final, so it asks first; Activate doesn't. */
export function ProposalCard({
  campaign: c,
  pending,
  onActivate,
  onClose,
  onManage,
}: {
  campaign: ApiCampaign
  pending: boolean
  onActivate(): void
  onClose(): void
  onManage(): void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <article aria-labelledby={`campaign-${c.id}`} className="flex w-full flex-col gap-4 rounded-xl bg-surface-raised p-5">
      <header className="flex items-start justify-between gap-3">
        <h2 id={`campaign-${c.id}`} className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">
          {c.title}
        </h2>
        <ProposalStatusBadge status={c.status} className="shrink-0" />
      </header>

      <div className="flex items-baseline gap-3">
        <span className="text-[23px] leading-8 font-semibold tracking-[-0.025em] tabular-nums">{board.card.discount(c.discount_pct)}</span>
        <span className="text-[13px] text-ink-muted">
          {board.card.code} <code className="rounded-md bg-field px-1.5 py-0.5 font-mono text-[13px] text-ink">{c.discount_code}</code>
        </span>
      </div>

      <dl className="flex flex-col gap-3 text-[14px] leading-5">
        <div className="flex flex-col gap-1.5">
          <dt className="text-[12px] font-medium text-ink-muted">{board.card.products}</dt>
          <dd>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {c.products.map((p) => (
                <li key={p.sku} className="rounded-md bg-field px-2 py-0.5 text-[13px]">
                  {p.name}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[12px] font-medium text-ink-muted">{board.card.slogan}</dt>
          <dd>{c.slogan}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[12px] font-medium text-ink-muted">{board.card.segment}</dt>
          <dd>{c.target_segment}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button type="button" className={button} disabled={!canActivate(c.status, pending)} onClick={onActivate}>
          {board.actions.activate}
        </Button>
        <Button type="button" variant="secondary" className={button} disabled={!canClose(c.status, pending)} onClick={() => setConfirming(true)}>
          {board.actions.close}
        </Button>
        <Button type="button" variant="ghost" className={button} onClick={onManage}>
          {board.actions.manage}
        </Button>
      </div>

      <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-sky/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-1/2 rounded-2xl bg-surface-raised p-6 text-ink shadow-pop data-[state=open]:animate-in data-[state=open]:zoom-in-95 motion-reduce:animate-none">
            <AlertDialog.Title className="text-[19px] leading-6 font-semibold">{board.closeDialog.title(c.title)}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[15px] leading-6 text-ink-muted">{board.closeDialog.body}</AlertDialog.Description>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" className={button}>
                  {board.closeDialog.cancel}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" className={button} onClick={onClose}>
                  {board.closeDialog.confirm}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </article>
  )
}
