// lib/auth.ts
import type { AuthUser } from './types'

const KEY = 'dino_auth_user'

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearAuthUser(): void {
  localStorage.removeItem(KEY)
}
