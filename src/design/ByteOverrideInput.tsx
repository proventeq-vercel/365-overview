import { useState } from 'react'
import { AdornedInput } from './AdornedInput'

interface ByteOverrideInputProps {
  id: string
  valueBytes: number | null
  unitBytes: number
  step: string
  min: string
  suffix: string
  placeholder: string
  onChange: (bytes: number | null) => void
}

const inUnits = (bytes: number | null, unitBytes: number): string =>
  bytes === null ? '' : String(bytes / unitBytes)

export function ByteOverrideInput({
  id,
  valueBytes,
  unitBytes,
  step,
  min,
  suffix,
  placeholder,
  onChange,
}: ByteOverrideInputProps) {
  const [text, setText] = useState(() => inUnits(valueBytes, unitBytes))

  return (
    <AdornedInput
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      suffix={suffix}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value === '' ? null : Number(e.target.value) * unitBytes)
      }}
      onBlur={() => setText(inUnits(valueBytes, unitBytes))}
    />
  )
}
