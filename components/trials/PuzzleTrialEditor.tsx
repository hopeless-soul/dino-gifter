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

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValid(board: number[][], r: number, c: number, n: number): boolean {
  if (board[r].includes(n)) return false
  if (board.some(row => row[c] === n)) return false
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[br + i][bc + j] === n) return false
  return true
}

function solveSudoku(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n
            if (solveSudoku(board)) return true
            board[r][c] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function generateSolved(): number[][] {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  solveSudoku(board)
  return board
}

export function PuzzleTrialEditor({ data, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('puzzle')

  function handleGenerate() {
    const solved = generateSolved()
    onChange({ grid: solved.map(r => [...r]), solution: solved.map(r => [...r]) })
    setMode('puzzle')
  }

  function updateCell(r: number, c: number, raw: string) {
    const n = Math.max(0, Math.min(9, parseInt(raw) || 0))
    const grid = data.grid.map(row => [...row])
    const solution = data.solution.map(row => [...row])
    if (mode === 'puzzle') {
      grid[r][c] = n
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
          Puzzle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'solution' ? 'default' : 'outline'}
          onClick={() => setMode('solution')}
        >
          Solution
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleGenerate}
        >
          Generate
        </Button>
      </div>

      <div
        className=""
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 28px)' }}
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
          ? 'Click Generate to create a solved board, then remove cell values to create the puzzle blanks.'
          : 'Fill all empty cells with the correct solution.'}
      </p>
    </div>
  )
}
