'use client'
import { useState } from 'react'

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
      <p className="text-sm text-gray-600">Type the phrase below to unlock</p>
      <input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className={`w-full border rounded px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400 text-gray-800' : 'border-gray-300 text-gray-800'
        }`}
        placeholder="Type here…"
      />
      {error && (
        <p className="text-red-500 text-sm">Incorrect phrase. Try again.</p>
      )}
      <button
        onClick={submit}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
      >
        Submit
      </button>
    </div>
  )
}
