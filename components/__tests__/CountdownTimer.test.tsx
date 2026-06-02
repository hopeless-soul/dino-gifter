import { describe, it, expect } from 'vitest'
import { formatCountdown } from '../CountdownTimer'

describe('formatCountdown', () => {
  it('formats 3661000ms as 01:01:01', () => {
    expect(formatCountdown(3661000)).toBe('01:01:01')
  })
  it('formats 0ms as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
  })
  it('formats negative ms as 00:00:00', () => {
    expect(formatCountdown(-500)).toBe('00:00:00')
  })
  it('pads single-digit values', () => {
    expect(formatCountdown(3600000 + 60000 + 5000)).toBe('01:01:05')
  })
  it('handles >24 hours correctly', () => {
    expect(formatCountdown(90061000)).toBe('25:01:01')
  })
})
