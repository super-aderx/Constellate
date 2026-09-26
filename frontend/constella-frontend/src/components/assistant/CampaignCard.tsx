import { GenMark } from "@/components/brand/GenMark"
import { cn } from "@/lib/utils"

/** A campaign the assistant drafted from the network. */
export interface Campaign {
  name: string
  offer: string
  slogans: string[]
  /** One sentence with the figures the draft is based on. */
  why?: string
}

interface CampaignCardProps {
  campaign: Campaign
  /** Small label above the name, e.g. "Campaign draft". */
  kind: string
  /** Build up piece by piece (name, offer, slogans, why) instead of appearing at once. */
  reveal?: boolean
  className?: string
}

const STAGGER_MS = 320
const enter = "animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:backwards] motion-reduce:animate-none"

/** The generated campaign: what it's called, the offer, slogan options and why. */
export function CampaignCard({ campaign, kind, reveal = true, className }: CampaignCardProps) {
  const step = (i: number) => (reveal ? { className: enter, style: { animationDelay: `${i * STAGGER_MS}ms` } } : {})

  return (
    <div className={cn("flex flex-col rounded-xl bg-surface-raised p-5 shadow-pop", className)}>
      <p {...step(0)}>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted">
          <GenMark size={14} />
          {kind}
        </span>
      </p>
      <div {...step(1)}>
        <h4 className="mt-1 text-[21px] leading-[1.25] font-semibold tracking-[-0.02em]">{campaign.name}</h4>
        <p className="mt-1 inline-block rounded-md bg-action px-2 py-0.5 text-[13px] font-semibold text-on-action">{campaign.offer}</p>
      </div>
      <ul className="mt-4 flex flex-col gap-1">
        {campaign.slogans.map((s, i) => (
          <li key={s} {...step(2 + i)}>
            <span className="text-[17px] leading-[1.4] font-semibold tracking-[-0.01em]">“{s}”</span>
          </li>
        ))}
      </ul>
      {campaign.why && (
        <p {...step(2 + campaign.slogans.length)}>
          <span className="mt-4 block border-t border-line pt-3 text-[13px] leading-[1.5] text-ink-muted">{campaign.why}</span>
        </p>
      )}
    </div>
  )
}
