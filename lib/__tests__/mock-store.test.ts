import { describe, it, expect, beforeEach } from 'vitest'
import { createGiveaway, getGiveaway, markRedeemed, _resetStore } from '../mock-store'

beforeEach(() => { _resetStore() })

const BASE = {
  invId: 337,
  dinoName: 'Теризинозавр',
  growthLabel: 'джув 0.2',
  activeAt: null,
  trial: null,
  session: 'abc123',
  recipientFriendId: '24556',
}

describe('createGiveaway', () => {
  it('returns a non-empty string id', () => {
    const id = createGiveaway(BASE)
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
  it('each call returns a unique id', () => {
    expect(createGiveaway(BASE)).not.toBe(createGiveaway(BASE))
  })
})

describe('getGiveaway', () => {
  it('retrieves the created giveaway by id', () => {
    const id = createGiveaway(BASE)
    const g = getGiveaway(id)
    expect(g?.dinoName).toBe('Теризинозавр')
    expect(g?.redeemed).toBe(false)
    expect(g?.session).toBe('abc123')
  })
  it('returns undefined for unknown id', () => {
    expect(getGiveaway('nonexistent')).toBeUndefined()
  })
})

describe('markRedeemed', () => {
  it('sets redeemed to true', () => {
    const id = createGiveaway(BASE)
    markRedeemed(id)
    expect(getGiveaway(id)?.redeemed).toBe(true)
  })
  it('is a no-op for unknown id', () => {
    expect(() => markRedeemed('unknown')).not.toThrow()
  })
})
