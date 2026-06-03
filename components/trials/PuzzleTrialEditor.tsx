// components/trials/PuzzleTrialEditor.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PuzzleTrialData } from '@/lib/types'

type Mode = 'puzzle' | 'solution'

interface Props {
  data: PuzzleTrialData
  onChange: (data: PuzzleTrialData) => void
}

export function PuzzleTrialEditor({ data, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('puzzle')

  function updateCell(r: number, c: number, raw: string) {
    const n = Math.max(0, Math.min(9, parseInt(raw) || 0))
    const grid = data.grid.map(row => [...row])
    const solution = data.solution.map(row => [...row])
    if (mode === 'puzzle') {
      grid[r][c] = n
      solution[r][c] = n
    } else {
      if (data.grid[r][c] !== 0) return
      solution[r][c] = n
    }
    onChange({ grid, solution })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'puzzle' ? 'default' : 'outline'}
          onClick={() => setMode('puzzle')}
        >
          Set Puzzle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'solution' ? 'default' : 'outline'}
          onClick={() => setMode('solution')}
        >
          Set Solution
        </Button>
      </div>

      <div
        className="border border-border"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 28px)', width: 'fit-content' }}
      >
        {data.grid.map((row, r) =>
          row.map((_, c) => {
            const isGiven = data.grid[r][c] !== 0
            const displayVal = mode === 'puzzle' ? data.grid[r][c] : data.solution[r][c]
            return (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={displayVal || ''}
                readOnly={mode === 'solution' && isGiven}
                onChange={e => updateCell(r, c, e.target.value)}
                className={cn(
                  'w-7 h-7 text-center text-xs border-border/40 border focus:outline-none focus:bg-primary/10',
                  isGiven && mode === 'solution' && 'font-bold bg-muted cursor-not-allowed',
                  c === 2 && 'border-r-2 border-r-border',
                  c === 5 && 'border-r-2 border-r-border',
                  r === 2 && 'border-b-2 border-b-border',
                  r === 5 && 'border-b-2 border-b-border',
                )}
              />
            )
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === 'puzzle'
          ? 'Fill the starting cells of the puzzle. Switch to "Set Solution" to enter the answer.'
          : 'Fill all empty cells with the correct solution.'}
      </p>
    </div>
  )
}
