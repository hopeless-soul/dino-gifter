// components/TrialConfigurator.tsx
'use client'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TypingTrialEditor } from '@/components/trials/TypingTrialEditor'
import { MathTrialEditor } from '@/components/trials/MathTrialEditor'
import { PuzzleTrialEditor } from '@/components/trials/PuzzleTrialEditor'
import type { TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'

interface TrialEntry {
  localId: string
  trial: TrialData
}

interface Props {
  trials: TrialData[]
  onChange: (trials: TrialData[]) => void
}

function emptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

function defaultTrial(type: TrialData['type']): TrialData {
  if (type === 'typing') return { type: 'typing', data: { phrase: '' } }
  if (type === 'math') return { type: 'math', data: { expression: '', answer: 0 } }
  return { type: 'puzzle', data: { grid: emptyGrid(), solution: emptyGrid() } }
}

export function TrialConfigurator({ trials, onChange }: Props) {
  const entries: TrialEntry[] = trials.map((t, i) => ({ localId: String(i), trial: t }))

  function emit(updated: TrialEntry[]) {
    onChange(updated.map(e => e.trial))
  }

  function addTrial() {
    emit([...entries, { localId: nanoid(), trial: defaultTrial('typing') }])
  }

  function removeTrial(localId: string) {
    emit(entries.filter(e => e.localId !== localId))
  }

  function changeType(localId: string, type: TrialData['type']) {
    emit(entries.map(e => e.localId === localId ? { ...e, trial: defaultTrial(type) } : e))
  }

  function changeData(localId: string, data: TypingTrialData | MathTrialData | PuzzleTrialData) {
    emit(entries.map(e => {
      if (e.localId !== localId) return e
      return { ...e, trial: { ...e.trial, data } as TrialData }
    }))
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <div
          key={entry.localId}
          className="p-3 bg-background rounded-md border border-border flex flex-col gap-3"
        >
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

          <Select value={entry.trial.type} onValueChange={v => changeType(entry.localId, v as TrialData['type'])}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typing">Typing</SelectItem>
              <SelectItem value="math">Math</SelectItem>
              <SelectItem value="puzzle">Puzzle (Sudoku)</SelectItem>
            </SelectContent>
          </Select>

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
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addTrial} className="w-full">
        + Add Trial
      </Button>
    </div>
  )
}
