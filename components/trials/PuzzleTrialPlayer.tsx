'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PuzzleTrialData } from '@/lib/types'

interface Props {
  data: PuzzleTrialData
  onSuccess: () => void
}

export function PuzzleTrialPlayer({ data, onSuccess }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    data.grid.map(row => [...row])
  )

  function updateCell(r: number, c: number, raw: string) {
    if (data.grid[r][c] !== 0) return
    const n = Math.max(0, Math.min(9, parseInt(raw) || 0))
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = n
      return next
    })
  }

  const isSolved = grid.every((row, r) =>
    row.every((cell, c) => cell === data.solution[r][c])
  )

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <p className="text-sm text-muted-foreground">Complete the Sudoku puzzle:</p>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 28px)', width: 'fit-content' }}
        className="border border-border"
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isGiven = data.grid[r][c] !== 0
            return (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={cell || ''}
                readOnly={isGiven}
                onChange={e => updateCell(r, c, e.target.value)}
                className={cn(
                  'w-7 h-7 text-center text-xs border-border/40 border focus:outline-none focus:bg-primary/10',
                  isGiven && 'font-bold bg-muted cursor-not-allowed',
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
      <Button onClick={onSuccess} disabled={!isSolved}>Next →</Button>
    </div>
  )
}
