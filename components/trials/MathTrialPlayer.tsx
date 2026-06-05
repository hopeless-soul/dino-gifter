'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MathTrialData } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  data: MathTrialData
  onSuccess: () => void
}

export function MathTrialPlayer({ data, onSuccess }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (Number(input) === data.answer) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center w-full h-full">
      <div className='flex flex-col h-full w-full gap-3' style={{ justifyContent: 'space-between' }}>
        <div className='flex flex-col w-full h-full items-center' style={{justifyContent: 'center'}}>
          <p className="text-sm text-muted-foreground">Solve the expression:</p>
          <div className="text-2xl font-bold font-mono px-4 py-2 bg-muted rounded-md flex" style={{ justifyContent: 'center', alignItems: 'center' }}>
            {data.expression}
          </div>
        </div>

        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Your answer…"
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      {error && <p className="text-destructive text-sm">Incorrect answer. Try again.</p>}
      <Button onClick={submit} className='w-full' style={{ background: '#5a4af4', color: '#fff' }}>Next →</Button>
    </div>
  )
}
