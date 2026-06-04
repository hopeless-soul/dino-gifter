// lib/__tests__/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getAuthUser, setAuthUser, clearAuthUser } from '../backend/auth'
import type { AuthUser } from '../types'

const USER: AuthUser = { id: 'abc-123', username: 'tester', role: 'Regular' }

beforeEach(() => {
  localStorage.clear()
})

describe('getAuthUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getAuthUser()).toBeNull()
  })
  it('returns the stored user after setAuthUser', () => {
    setAuthUser(USER)
    expect(getAuthUser()).toEqual(USER)
  })
  it('returns null when stored value is not valid JSON', () => {
    localStorage.setItem('dino_auth_user', 'not-json}}}')
    expect(getAuthUser()).toBeNull()
  })
})

describe('setAuthUser', () => {
  it('persists the user to localStorage', () => {
    setAuthUser(USER)
    const raw = localStorage.getItem('dino_auth_user')
    expect(JSON.parse(raw!)).toEqual(USER)
  })
})

describe('clearAuthUser', () => {
  it('removes the user from localStorage', () => {
    setAuthUser(USER)
    clearAuthUser()
    expect(getAuthUser()).toBeNull()
  })
})
