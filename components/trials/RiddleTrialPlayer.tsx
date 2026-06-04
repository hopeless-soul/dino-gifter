'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RiddleTrialData } from '@/lib/types'

interface Props {
  data: RiddleTrialData
  onSuccess: () => void
}

export function RiddleTrialPlayer({ data, onSuccess }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (input.trim().toLowerCase() === data.answer.trim().toLowerCase()) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center max-w-lg mx-auto w-full h-full">
      <div className="flex flex-col h-full w-full gap-3" style={{ justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            flex: '1',
            background: '#1e1e1e',
            color: '#aaa',
            padding: '16px',
            fontSize: '13px',
            fontFamily: 'serif',
            borderRadius: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
          className="w-full"
        >
          {data.riddle}
        </div>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="Your answer…"
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      {error && (
        <p className="text-destructive text-sm">Wrong answer. Try again.</p>
      )}
      <Button onClick={submit} variant="success" className="w-full">
        Submit
      </Button>
    </div>
  )
}
