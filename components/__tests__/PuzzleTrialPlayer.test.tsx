import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PuzzleTrialPlayer } from '../trials/PuzzleTrialPlayer'
import type { PuzzleTrialData } from '@/lib/types'

function makeData(solution: number[][]): PuzzleTrialData {
  return {
    grid: Array.from({ length: 9 }, () => Array(9).fill(0)),
    solution,
  }
}

const FULL_SOLUTION = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => ((r * 9 + c) % 9) + 1)
)

describe('PuzzleTrialPlayer', () => {
  it('renders 81 input cells', () => {
    const data = makeData(FULL_SOLUTION)
    render(<PuzzleTrialPlayer data={data} onSuccess={vi.fn()} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(81)
  })

  it('"Next" button is disabled when grid is not solved', () => {
    const data = makeData(FULL_SOLUTION)
    render(<PuzzleTrialPlayer data={data} onSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onSuccess when all cells match the solution', () => {
    const onSuccess = vi.fn()
    const solution = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (r === 0 && c === 0 ? 5 : 1))
    )
    const data = makeData(solution)
    render(<PuzzleTrialPlayer data={data} onSuccess={onSuccess} />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input, idx) => {
      const r = Math.floor(idx / 9)
      const c = idx % 9
      fireEvent.change(input, { target: { value: String(solution[r][c]) } })
    })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
