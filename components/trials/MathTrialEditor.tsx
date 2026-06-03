// components/trials/MathTrialEditor.tsx
'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MathTrialData } from '@/lib/types'

interface Props {
  data: MathTrialData
  onChange: (data: MathTrialData) => void
}

export function MathTrialEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Expression</Label>
        <Input
          value={data.expression}
          onChange={e => onChange({ ...data, expression: e.target.value })}
          placeholder="e.g. 12 × 4 + 7"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Answer</Label>
        <Input
          type="number"
          value={data.answer === 0 ? '' : data.answer}
          onChange={e => onChange({ ...data, answer: Number(e.target.value) || 0 })}
          placeholder="55"
        />
      </div>
    </div>
  )
}
