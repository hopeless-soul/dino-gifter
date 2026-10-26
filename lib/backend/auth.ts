// lib/backend/auth.ts
import type { AuthUser } from '../types'
import { clearDemoStore } from '../demo/store'

const KEY = 'dino_auth_user'

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as AuthUser
    // Demo sessions expire; take their data with them
    if (user.expiresAt && user.expiresAt < Date.now()) {
      clearAuthUser()
      clearDemoStore()
      return null
    }
    return user
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearAuthUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
