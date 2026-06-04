'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  value: string
  onChange: (v: string) => void
  onConnect: () => void
  loading?: boolean
  error?: string | null
}

export function SessionInput({ value, onChange, onConnect, loading, error }: Props) {
  return (
    <Card className='w-full'>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your UserSession Cookie {!value && <span className='text-muted-foreground ml-1'>(unsaved)</span>}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
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
      </CardContent>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </Card>
  )
}
