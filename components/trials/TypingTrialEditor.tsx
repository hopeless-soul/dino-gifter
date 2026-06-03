// components/trials/TypingTrialEditor.tsx
'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TypingTrialData } from '@/lib/types'

interface Props {
  data: TypingTrialData
  onChange: (data: TypingTrialData) => void
}

export function TypingTrialEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground font-normal text-xs">Phrase to type exactly</Label>
      <Input
        value={data.phrase}
        onChange={e => onChange({ phrase: e.target.value })}
        placeholder="e.g. I love Theri"
      />
    </div>
  )
}
