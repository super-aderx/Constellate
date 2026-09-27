import { cn } from "@/lib/utils"

interface SuggestedQuestionsProps {
  questions: string[]
  onPick: (question: string) => void
  /** Accessible name for the group, e.g. "Follow-up questions". */
  label: string
  className?: string
}

/** Questions to ask next, as quiet field chips. */
export function SuggestedQuestions({ questions, onPick, label, className }: SuggestedQuestionsProps) {
  return (
    <ul aria-label={label} className={cn("m-0 flex list-none flex-wrap gap-2 p-0", className)}>
      {questions.map((q) => (
        <li key={q}>
          <button
            type="button"
            onClick={() => onPick(q)}
            className="cursor-pointer rounded-full bg-field px-3 py-[7px] text-left text-[13px] leading-[18px] text-ink transition-colors hover:bg-[color-mix(in_srgb,var(--field)_85%,var(--ink))]"
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  )
}
