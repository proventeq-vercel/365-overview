import { useState, type ComponentProps } from 'react'
import { AdornedInput } from './AdornedInput'

interface Props extends Omit<ComponentProps<typeof AdornedInput>, 'value' | 'onChange' | 'onBlur'> {
  value: string
  onDraft: (text: string) => boolean
}

export function DraftInput({ value, onDraft, ...props }: Props) {
  const [draft, setDraft] = useState<{ text: string; valid: boolean } | null>(null)

  return (
    <AdornedInput
      {...props}
      value={draft?.text ?? value}
      aria-invalid={draft !== null && !draft.valid}
      onChange={(e) => setDraft({ text: e.target.value, valid: onDraft(e.target.value) })}
      onBlur={() => setDraft(null)}
    />
  )
}
