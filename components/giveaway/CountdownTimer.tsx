'use client'
import { useState, useEffect, useCallback } from 'react'

interface CountdownProps {
  activeAt: string | null
  className?: string
}

export function Countdown({ activeAt, className = 'text-xs font-mono text-muted-foreground' }: CountdownProps) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!activeAt) return
    const target = new Date(activeAt).getTime()
    const tick = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeAt])

  if (!activeAt) return null
  return <span className={className}>{formatCountdown(remaining * 1000)}</span>
}

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
    <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: '#9a8aff' }}>
      {formatCountdown(remaining)}
    </p>
  )
}
