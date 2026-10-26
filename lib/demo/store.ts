// Demo giveaways live in localStorage; their TTL is the demo AuthUser's expiresAt
// (getAuthUser clears everything here once it passes).
// shortcut: browser-local only, no cross-device sharing; upgrade to a server store if demos must be shared.
import type { Giveaway } from '../types'
import { loadSession, saveSession } from '../frontend/session'

const KEY = 'dino_demo_giveaways'
export const DEMO_SESSION = 'demo'

export function loadGiveaways(): Giveaway[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Giveaway[]
  } catch {
    return []
  }
}

export function saveGiveaways(list: Giveaway[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

// Wipes demo data and the fake game session, so a later real login does not inherit "demo".
export function clearDemoStore(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  if (loadSession() === DEMO_SESSION) saveSession('')
}
