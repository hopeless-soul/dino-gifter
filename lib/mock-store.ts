import { nanoid } from 'nanoid'
import type { GiveawayConfig } from './types'

const store = new Map<string, GiveawayConfig>()

export function createGiveaway(
  config: Omit<GiveawayConfig, 'id' | 'createdAt' | 'redeemed'>
): string {
  const id = nanoid()
  store.set(id, { ...config, id, createdAt: new Date().toISOString(), redeemed: false })
  return id
}

export function getGiveaway(id: string): GiveawayConfig | undefined {
  return store.get(id)
}

export function markRedeemed(id: string): void {
  const g = store.get(id)
  if (g) store.set(id, { ...g, redeemed: true })
}

/** For tests only — clears all giveaways */
export function _resetStore(): void {
  store.clear()
}
