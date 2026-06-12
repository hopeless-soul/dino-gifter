// components/giveaway/TrialConfigurator.tsx
'use client'
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TypingTrialEditor } from '@/components/trials/TypingTrialEditor'
import { MathTrialEditor } from '@/components/trials/MathTrialEditor'
import { PuzzleTrialEditor } from '@/components/trials/PuzzleTrialEditor'
import { RiddleTrialEditor } from '@/components/trials/RiddleTrialEditor'
import type { TrialData, TypingTrialData, MathTrialData, PuzzleTrialData, RiddleTrialData } from '@/lib/types'

// TrialEntry wraps a TrialData with a stable client-only localId used as the React key
// and for targeting mutations — it never leaves the component.
interface TrialEntry {
  localId: string
  trial: TrialData
}

interface Props {
  trials: TrialData[]
  onChange: (trials: TrialData[]) => void
}

// --- Helpers ---

// Returns a blank 9×9 grid of zeros, used as the initial puzzle/solution for new puzzle trials
function emptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

// Returns a type-safe default TrialData for a given trial type
function defaultTrial(type: TrialData['type']): TrialData {
  if (type === 'typing') return { type: 'typing', data: { phrase: '' } }
  if (type === 'math') return { type: 'math', data: { expression: '', answer: 0 } }
  if (type === 'riddle') return { type: 'riddle', data: { riddle: '', answer: '' } }
  return { type: 'puzzle', data: { grid: emptyGrid(), solution: emptyGrid() } }
}

export function TrialConfigurator({ trials, onChange }: Props) {
  // Seed entries from the parent's trial list on first render; localId is kept internal
  const [entries, setEntries] = useState<TrialEntry[]>(() =>
    trials.map(t => ({ localId: nanoid(), trial: t }))
  )

  // Central updater: keeps local state and parent in sync in one call
  function emit(updated: TrialEntry[]) {
    setEntries(updated)
    onChange(updated.map(e => e.trial))
  }

  // --- Entry mutations ---

  // Appends a new typing trial (the most common default)
  function addTrial() {
    emit([...entries, { localId: nanoid(), trial: defaultTrial('typing') }])
  }

  function removeTrial(localId: string) {
    emit(entries.filter(e => e.localId !== localId))
  }

  // Switching type resets data to the new type's defaults rather than trying to migrate
  function changeType(localId: string, type: TrialData['type']) {
    emit(entries.map(e => e.localId === localId ? { ...e, trial: defaultTrial(type) } : e))
  }

  // Partial update: preserves the trial type, replaces only the data payload
  function changeData(localId: string, data: TypingTrialData | MathTrialData | PuzzleTrialData | RiddleTrialData) {
    emit(entries.map(e => {
      if (e.localId !== localId) return e
      return { ...e, trial: { ...e.trial, data } as TrialData }
    }))
  }

  // --- Render ---

  return (
    <div className="flex flex-col gap-3">
      {/* One card per trial entry */}
      {entries.map((entry, i) => (
        <div
          key={entry.localId}
          className="p-3 bg-background rounded-md border border-border flex flex-col gap-3"
        >
          {/* Card header: trial number label + remove button */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Trial {i + 1}
            </span>
            <button
              type="button"
              aria-label="Remove trial"
              onClick={() => removeTrial(entry.localId)}
              className="text-muted-foreground hover:text-destructive text-sm leading-none"
            >
              ✕
            </button>
          </div>

          {/* Type selector — changing resets the data payload via changeType */}
          <Select value={entry.trial.type} onValueChange={v => changeType(entry.localId, v as TrialData['type'])}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typing">Typing</SelectItem>
              <SelectItem value="math">Math</SelectItem>
              <SelectItem value="puzzle">Puzzle (Sudoku)</SelectItem>
              <SelectItem value="riddle">Riddle</SelectItem>
            </SelectContent>
          </Select>

          {/* Type-specific editor — only the matching one renders */}
          {entry.trial.type === 'typing' && (
            <TypingTrialEditor
              data={entry.trial.data as TypingTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
          {entry.trial.type === 'math' && (
            <MathTrialEditor
              data={entry.trial.data as MathTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
          {entry.trial.type === 'puzzle' && (
            <PuzzleTrialEditor
              data={entry.trial.data as PuzzleTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
          {entry.trial.type === 'riddle' && (
            <RiddleTrialEditor
              data={entry.trial.data as RiddleTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addTrial} className="w-full">
        + Add Trial
      </Button>
    </div>
  )
}
