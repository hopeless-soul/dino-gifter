'use client'
import { useState, useEffect } from 'react'
import { loadSession, saveSession } from '@/lib/backend/session'

export function useSession() {
  const [session, setSessionState] = useState('')

  useEffect(() => {
    setSessionState(loadSession())
  }, [])

  function setSession(value: string) {
    saveSession(value)
    setSessionState(value)
  }

  return [session, setSession] as const
}
