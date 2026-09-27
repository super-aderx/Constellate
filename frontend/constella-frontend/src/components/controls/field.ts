/**
 * Constella's text field: a filled box with an underline instead of an outline. Focus thickens the
 * underline in the focus colour; aria-invalid turns it red.
 */
export const fieldClass =
  "w-full rounded-t-md bg-field px-3 text-[15px] text-ink shadow-[inset_0_-1px_0_var(--line-strong)] outline-none placeholder:text-ink-faint hover:shadow-[inset_0_-2px_0_var(--line-strong)] focus-visible:shadow-[inset_0_-2px_0_var(--focus)] focus-visible:outline-none aria-[invalid=true]:shadow-[inset_0_-2px_0_var(--negative)]"
