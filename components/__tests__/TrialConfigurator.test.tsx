import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrialConfigurator } from '../giveaway/TrialConfigurator'

describe('TrialConfigurator', () => {
  it('renders an Add Trial button', () => {
    render(<TrialConfigurator trials={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add trial/i })).toBeInTheDocument()
  })

  it('calls onChange with a new typing trial when + is clicked and type selected', () => {
    const onChange = vi.fn()
    render(<TrialConfigurator trials={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /add trial/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'typing' }),
      ])
    )
  })

  it('removes a trial when ✕ is clicked', () => {
    const onChange = vi.fn()
    const trials = [{ type: 'typing' as const, data: { phrase: 'hello' } }]
    render(<TrialConfigurator trials={trials} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
