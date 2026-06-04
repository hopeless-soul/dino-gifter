'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
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
    <div className="flex flex-col gap-3 items-center max-w-sm mx-auto w-full">
      <p className="text-sm text-muted-foreground">Type the phrase below to unlock</p>
      <Input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Type here…"
        className={cn('text-center', error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && (
        <p className="text-destructive text-sm">Incorrect phrase. Try again.</p>
      )}
      <Button onClick={submit} variant="success">
        Submit
      </Button>
    </div>
  )
}
