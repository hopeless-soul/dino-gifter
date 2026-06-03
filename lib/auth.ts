// lib/auth.ts
import type { AuthUser } from './types'

const KEY = 'dino_auth_user'

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
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
