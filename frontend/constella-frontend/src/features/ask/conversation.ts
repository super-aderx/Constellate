import { useSyncExternalStore } from "react"
import type { PeriodId, SegmentId } from "@/data/store"
import { answer, type Answer, type Scope } from "./engine"

/**
 * The conversation with Constella AI, kept in memory so it survives moving between pages.
 * Resets on reload, like the rest of the mock data.
 */

export interface Turn {
  id: number
  question: string
  scope: Scope
  /** Written at once; shown when `ready`, after a short "reading" pause that names what it reads. */
  answer: Answer
  ready: boolean
  /** Which slogan set the campaign card shows. */
  sloganSet: number
  /** Campaign id once the draft is saved to Campaigns. */
  savedAs?: string
}

let turns: Turn[] = []
let scope: Scope = { period: "90d", segment: "all" }
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useTurns = () => useSyncExternalStore(subscribe, () => turns, () => turns)
export const useScope = () => useSyncExternalStore(subscribe, () => scope, () => scope)

export function setScope(next: { period?: PeriodId; segment?: SegmentId }) {
  scope = { ...scope, ...next }
  emit()
}

function update(id: number, patch: Partial<Turn>) {
  turns = turns.map((t) => (t.id === id ? { ...t, ...patch } : t))
  emit()
}

/** Asks a question; the answer arrives after a short "reading" pause. Returns the turn's id. */
export function ask(question: string, readMs: number) {
  const id = nextId++
  const asked = { ...scope }
  turns = [...turns, { id, question, scope: asked, answer: answer(question, asked), ready: false, sloganSet: 0 }]
  emit()
  setTimeout(() => update(id, { ready: true }), readMs)
  return id
}

export function nextSlogans(id: number) {
  const t = turns.find((x) => x.id === id)
  const sets = t?.answer?.campaign?.sloganSets.length ?? 1
  if (t) update(id, { sloganSet: (t.sloganSet + 1) % sets })
}

export function markSaved(id: number, campaignId: string) {
  update(id, { savedAs: campaignId })
}

export function clearConversation() {
  turns = []
  emit()
}
