'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MathTrialData } from '@/lib/types'

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
    <div className="flex flex-col gap-3 items-center w-full">
      <p className="text-sm text-muted-foreground">Solve the expression:</p>
      <div className="text-2xl font-bold font-mono px-4 py-2 bg-muted rounded-md">
        {data.expression}
      </div>
      <Input
        type="number"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Your answer"
        className="text-center max-w-xs"
      />
      {error && <p className="text-destructive text-sm">Incorrect answer. Try again.</p>}
      <Button onClick={submit}>Next →</Button>
    </div>
  )
}
