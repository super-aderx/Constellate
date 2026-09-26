import { Fragment, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { AskBar, CampaignCard } from "@/components/assistant"
import { GenMark } from "@/components/brand/GenMark"
import { ConstellationGraph } from "@/components/graph"
import { useInView } from "@/hooks/useInView"
import { useTimeline } from "@/hooks/useTimeline"
import { prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ai, edges, nodes, type DemoChat } from "./content"

const TYPE_MS = 30
const SEND_MS = 300
/** Matches the graph's own entrance, so the pick turns peach as the reply starts. */
const READ_MS = 1900
const WORD_MS = 55
const CARD_MS = 2400
/** Pause on a finished reply before auto-playing the next example. */
const HOLD_MS = 5000

/** Reply text as words; **bold** runs stay whole so they stream in as one piece. */
function words(answer: string) {
  return answer
    .split(/(\*\*[^*]+\*\*)/)
    .flatMap((part) =>
      part.startsWith("**") ? [{ text: part.slice(2, -2), bold: true }] : part.split(" ").filter(Boolean).map((text) => ({ text, bold: false })),
    )
}

function schedule(chat: DemoChat) {
  const sent = chat.prompt.length * TYPE_MS + SEND_MS
  const found = sent + READ_MS
  const replied = found + words(chat.answer).length * WORD_MS
  return { sent, found, replied, end: replied + (chat.campaign ? CARD_MS : 0) }
}

/**
 * A short, simulated chat with Constella AI. The question types itself, the AI reads the
 * relevant part of the network (its pick turns peach), the reply streams in, and campaign
 * requests end with a campaign draft. Plays each example once; the chips replay any of them.
 *
 * The panel never changes height: every example's finished thread is laid out invisibly in the
 * same grid cell, so the cell is always as tall as the longest one, and the live thread plays on top.
 */
export function AskDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4)
  const [reduced] = useState(prefersReducedMotion)
  // null = auto-playing every example in turn; a number = the one the visitor picked
  const [picked, setPicked] = useState<number | null>(reduced ? 0 : null)
  const [run, setRun] = useState(0)

  // Auto-play is one timeline across all examples, with a pause after each one except the last.
  const spans = ai.chats.map((c, i) => schedule(c).end + (i < ai.chats.length - 1 ? HOLD_MS : 0))
  const total = picked === null ? spans.reduce((a, b) => a + b, 0) : schedule(ai.chats[picked]).end
  const overall = useTimeline(total, inView, picked === null ? "auto" : `${picked}-${run}`)

  let index = picked ?? 0
  let elapsed = overall
  if (picked === null) {
    while (index < spans.length - 1 && elapsed >= spans[index]) elapsed -= spans[index++]
  }

  const chat = ai.chats[index]
  const t = schedule(chat)
  const sent = elapsed >= t.sent
  const done = elapsed >= t.end
  const reply = words(chat.answer)

  const play = (i: number) => {
    setPicked(i)
    setRun((r) => r + 1)
  }

  return (
    <div ref={ref} className="rounded-2xl bg-surface p-2 sm:p-3 md:p-5">
      <div role="group" aria-label={ai.goalsLabel} className="flex flex-wrap gap-2 px-1 pb-3">
        {ai.chats.map((c, i) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={index === i}
            onClick={() => play(i)}
            className={cn(
              "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              index === i ? "bg-star-soft text-star-ink" : "bg-surface-raised text-ink-muted hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-surface-raised p-3 shadow-pop sm:p-4 md:p-5">
        <div className="grid">
          {/* Space holders: each example's finished thread, invisible */}
          {ai.chats.map((c) => (
            <div key={c.id} aria-hidden className="invisible [grid-area:1/1]">
              <ChatThread chat={c} ghost found shown={words(c.answer).length} showCard reveal={false} />
            </div>
          ))}
          <div className="[grid-area:1/1]">
            {sent && (
              <ChatThread
                key={`${chat.id}-${run}`}
                chat={chat}
                found={elapsed >= t.found}
                shown={Math.max(0, Math.min(reply.length, Math.floor((elapsed - t.found) / WORD_MS)))}
                showCard={elapsed >= t.replied}
                reveal={!reduced}
              />
            )}
          </div>
        </div>

        <div className="pt-5">
          <AskBar draft={sent ? "" : chat.prompt.slice(0, Math.floor(elapsed / TYPE_MS))} placeholder={ai.placeholder} typing={!sent} />
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-ink-muted">
            <span>{ai.footnote}</span>
            <button
              type="button"
              onClick={() => play(index)}
              tabIndex={done ? 0 : -1}
              className={cn("shrink-0 rounded-sm underline underline-offset-2 hover:text-ink", !done && "invisible")}
            >
              {ai.replay}
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {done
          ? [
              chat.prompt,
              reply.map((w) => w.text).join(" "),
              chat.campaign && `${ai.kind}: ${chat.campaign.name}. ${chat.campaign.offer}. ${chat.campaign.slogans.join(" ")}`,
            ]
              .filter(Boolean)
              .join(" ")
          : ""}
      </p>
    </div>
  )
}

interface ChatThreadProps {
  chat: DemoChat
  /** The AI has read the network: the pick is peach and the reply is streaming. */
  found: boolean
  /** Words of the reply shown so far. */
  shown: number
  showCard: boolean
  reveal: boolean
  /** Layout-only copy: no graph, no animation. */
  ghost?: boolean
}

/** The visitor's message and Constella AI's reply at a given point in playback. */
function ChatThread({ chat, found, shown, showCard, reveal, ghost = false }: ChatThreadProps) {
  const reply = words(chat.answer)
  const subNodes = nodes.filter((n) => n.id in chat.positions)
  const subEdges = edges.filter((e) => e.source in chat.positions && e.target in chat.positions)
  const enter = !ghost && "animate-in fade-in motion-reduce:animate-none"

  return (
    <div className="flex flex-col gap-4">
      <p className={cn("max-w-[85%] self-end rounded-xl rounded-br-sm bg-field px-3.5 py-2 text-[15px]", enter, !ghost && "slide-in-from-bottom-2")}>
        {chat.prompt}
      </p>

      <div className={cn(enter)}>
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-field">
            <GenMark size={14} />
          </span>
          {ai.name}
        </p>

        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <figure data-theme="night" className="overflow-hidden rounded-xl bg-sky text-ink">
            {ghost ? (
              <div className="aspect-[8/5]" />
            ) : (
              <ConstellationGraph
                nodes={subNodes}
                edges={subEdges}
                positions={chat.positions}
                width={320}
                height={200}
                selectedId={found ? chat.focus : null}
                interactive={false}
                label={subNodes.map((n) => n.label).join(", ")}
                className="bg-transparent"
              />
            )}
          </figure>

          <div className="text-[16px] leading-[1.6]">
            {!found ? (
              <p className="flex items-center gap-2 text-[14px] text-ink-muted">
                <LoaderCircleIcon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                {chat.reading}…
              </p>
            ) : (
              <p>
                {reply.slice(0, shown).map((w, i) => (
                  <Fragment key={i}>
                    {i > 0 && " "}
                    {w.bold ? <strong className="font-semibold tabular-nums">{w.text}</strong> : w.text}
                  </Fragment>
                ))}
                {shown < reply.length && (
                  <span aria-hidden className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-ink" />
                )}
              </p>
            )}
          </div>
        </div>

        {chat.campaign && showCard && (
          <CampaignCard campaign={chat.campaign} kind={ai.kind} reveal={reveal} className="mt-4 bg-surface shadow-none" />
        )}
      </div>
    </div>
  )
}
