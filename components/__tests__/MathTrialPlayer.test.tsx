import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MathTrialPlayer } from '../trials/MathTrialPlayer'

const DATA = { expression: '3 + 4', answer: 7 }

describe('MathTrialPlayer', () => {
  it('displays the expression', () => {
    render(<MathTrialPlayer data={DATA} onSuccess={vi.fn()} />)
    expect(screen.getByText('3 + 4')).toBeInTheDocument()
  })

  it('calls onSuccess when correct answer is submitted', () => {
    const onSuccess = vi.fn()
    render(<MathTrialPlayer data={DATA} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not call onSuccess for wrong answer', () => {
    const onSuccess = vi.fn()
    render(<MathTrialPlayer data={DATA} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows error text for wrong answer', () => {
    render(<MathTrialPlayer data={DATA} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })

  it('submits on Enter key with correct answer', () => {
    const onSuccess = vi.fn()
    render(<MathTrialPlayer data={DATA} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } })
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' })
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
