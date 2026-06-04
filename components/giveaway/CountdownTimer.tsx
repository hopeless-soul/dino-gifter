'use client'
import { useState, useEffect, useCallback } from 'react'

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

interface Props {
  activeAt: string
  onActive?: () => void
}

export function CountdownTimer({ activeAt, onActive }: Props) {
  const target = new Date(activeAt).getTime()
  const [remaining, setRemaining] = useState(() => target - Date.now())

  const handleActive = useCallback(() => onActive?.(), [onActive])

  useEffect(() => {
    if (remaining <= 0) { handleActive(); return }
    const id = setInterval(() => {
      const r = target - Date.now()
      setRemaining(r)
      if (r <= 0) { clearInterval(id); handleActive() }
    }, 1000)
    return () => clearInterval(id)
  }, [target, handleActive])

  if (remaining <= 0) return null

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Available in</p>
      <p className="text-4xl font-mono font-bold tabular-nums text-foreground">
        {formatCountdown(remaining)}
      </p>
    </div>
  )
}
