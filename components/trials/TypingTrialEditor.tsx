// components/trials/TypingTrialEditor.tsx
'use client'
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
      <textarea
        value={data.phrase}
        onChange={e => onChange({ phrase: e.target.value })}
        placeholder="e.g. Nice watch. Too bad you won't be able to tell the time after I break it. Break your face, that is."
        rows={3}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
    </div>
  )
}
