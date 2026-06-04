// components/trials/RiddleTrialEditor.tsx
'use client'
import { Label } from '@/components/ui/label'
import type { RiddleTrialData } from '@/lib/types'

interface Props {
  data: RiddleTrialData
  onChange: (data: RiddleTrialData) => void
}

export function RiddleTrialEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Riddle</Label>
        <textarea
          value={data.riddle}
          onChange={e => onChange({ ...data, riddle: e.target.value })}
          placeholder="e.g. I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Answer (case-insensitive)</Label>
        <input
          type="text"
          value={data.answer}
          onChange={e => onChange({ ...data, answer: e.target.value })}
          placeholder="e.g. an echo"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  )
}
