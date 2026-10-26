'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthUser, clearAuthUser } from '@/lib/backend/auth'
import api from '@/lib/backend/api'
import { clearDemoStore } from '@/lib/demo/store'
import type { AuthUser } from '@/lib/types'

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getAuthUser())
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* best-effort */ }
    clearAuthUser()
    clearDemoStore() // no-op outside demo; also drops the fake game session
    setUser(null)
  }, [])

  return { user, setUser, logout }
}
