'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  value: string
  onChange: (v: string) => void
  onConnect: () => void
  loading?: boolean
  error?: string | null
}

export function SessionInput({ value, onChange, onConnect, loading, error }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 border-b border-border">
      <div className="flex gap-2 max-w-2xl">
        <Input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value.trim() && onConnect()}
          placeholder="Paste your UserSession cookie…"
          className="font-mono"
        />
        <Button
          onClick={onConnect}
          disabled={!value.trim() || loading}
          variant="default"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
