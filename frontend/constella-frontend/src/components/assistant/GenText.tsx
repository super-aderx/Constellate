import { DataRef } from "./DataRef"

/** Generated text: plain strings, and figures that name the data they came from. */
export type Segment = string | { value: string; source: string }

/** Renders generated text, wrapping every figure in a DataRef. */
export function GenText({ segments }: { segments: Segment[] }) {
  return segments.map((s, i) =>
    typeof s === "string" ? (
      s
    ) : (
      <DataRef key={i} source={s.source}>
        {s.value}
      </DataRef>
    ),
  )
}
