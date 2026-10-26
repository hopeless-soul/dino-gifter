// Enable / disable / reset demo mode. Each ends in a full page load so api, navbar and Pusher re-read the user.
import api from '../backend/api'
import { clearAuthUser, getAuthUser, setAuthUser } from '../backend/auth'
import { saveSession } from '../frontend/session'
import { clearDemoStore, DEMO_SESSION, saveGiveaways } from './store'
import { mockGiveaways } from './mock-data'

const TTL_MS = 2 * 60 * 60 * 1000

function demoUser() {
  return {
    id: `demo-${crypto.randomUUID()}`,
    username: 'demo',
    role: 'Operator' as const,
    token: 'demo',
    demo: true,
    expiresAt: Date.now() + TTL_MS,
  }
}

// Fresh demo data: the starter giveaway plus the fake game session.
function seedDemo() {
  clearDemoStore()
  saveGiveaways(mockGiveaways())
  saveSession(DEMO_SESSION)
}

export async function enableDemo(): Promise<void> {
  // Sign out of a real session first, server side too (the interceptor still has their token here).
  if (getAuthUser() && !getAuthUser()?.demo) {
    try { await api.post('/auth/logout') } catch { /* best-effort */ }
  }
  clearAuthUser()
  seedDemo()
  setAuthUser(demoUser())
  window.location.href = '/'
}

export function disableDemo(): void {
  clearAuthUser()
  clearDemoStore()
  saveSession('')
  window.location.href = '/login'
}

export function resetDemo(): void {
  seedDemo()
  setAuthUser(demoUser())
  window.location.reload()
}
