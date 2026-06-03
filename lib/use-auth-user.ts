'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthUser, clearAuthUser } from './auth'
import api from './api'
import type { AuthUser } from './types'

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getAuthUser())
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* best-effort */ }
    clearAuthUser()
    setUser(null)
  }, [])

  return { user, setUser, logout }
}
