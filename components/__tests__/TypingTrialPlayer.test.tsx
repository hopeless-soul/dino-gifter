import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TypingTrialPlayer } from '../trials/TypingTrialPlayer'

describe('TypingTrialPlayer', () => {
  it('calls onSuccess when the correct phrase is submitted', () => {
    const onSuccess = vi.fn()
    render(<TypingTrialPlayer data={{ phrase: 'hello world' }} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello world' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not call onSuccess when wrong phrase is submitted', () => {
    const onSuccess = vi.fn()
    render(<TypingTrialPlayer data={{ phrase: 'hello world' }} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong answer' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows error text when wrong phrase is submitted', () => {
    render(<TypingTrialPlayer data={{ phrase: 'hello world' }} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })

  it('also submits on Enter key', () => {
    const onSuccess = vi.fn()
    render(<TypingTrialPlayer data={{ phrase: 'abc' }} onSuccess={onSuccess} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
