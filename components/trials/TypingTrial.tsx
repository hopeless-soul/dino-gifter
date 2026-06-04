'use client'
import { useState } from 'react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  phrase: string
  onSuccess: () => void
}

export function TypingTrial({ phrase, onSuccess }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (input === phrase) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center max-w-lg mx-auto w-full h-full">
      {/* Trial Content */}
      <div className='flex flex-col h-full w-full gap-3' style={{ justifyContent: 'space-between' }}>
        {/* <div className='h-full gap-' style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}> */}
          {/* Can't be selected */}
          <div style={{
            display: 'flex',
            flex: '1',
            background: "#1e1e1e",
            color: "#aaa",
            padding: '16px',
            fontSize: "13px",
            fontFamily: 'monospace',
            borderRadius: '8px',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
          }} className='w-full'>{phrase}</div>
        {/* </div> */}
        <textarea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); setError(false) }}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          placeholder="Type here…"
          rows={3}
          style={{
            fontFamily: 'monospace',
            fontSize: "13px",
            background: "#1e1e1e",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "9px 12px",
            color: "#aaa",
            flex: '1',
          }}
          className={cn('flex w-full rounded-md border border-input text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none', error && 'border-destructive focus-visible:ring-destructive')}
        />
      </div>
      {error && (
        <p className="text-destructive text-sm">Incorrect phrase. Try again.</p>
      )}
      <Button onClick={submit} variant="success" className='w-full'>
        Submit
      </Button>
    </div>
  )
}
