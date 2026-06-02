'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import type { InventoryItem, TypingTrial } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState<number | null>(null)
  const [activeAt, setActiveAt] = useState('')
  const [trialEnabled, setTrialEnabled] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    if (!session) return
    const res = await fetch('/api/slots?server=1', {
      headers: { 'x-user-session': session },
    })
    if (res.ok) {
      const data = await res.json() as { inventory: InventoryItem[] }
      setInventory(data.inventory)
    }
  }, [session])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  useEffect(() => {
    const id = params.get('invId')
    if (id) setInvId(parseInt(id, 10))
  }, [params])

  const selectedItem = inventory.find(i => i.id === invId)

  async function submit() {
    if (!session) { setError('No session. Go back and Connect first.'); return }
    if (!invId) { setError('Select a dino.'); return }
    if (trialEnabled && !phrase.trim()) { setError('Enter a trial phrase.'); return }

    setSubmitting(true)
    setError(null)

    const trial: TypingTrial | null = trialEnabled
      ? { type: 'typing', phrase: phrase.trim() }
      : null

    try {
      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          invId,
          dinoName: selectedItem?.name ?? '',
          growthLabel: selectedItem?.growthLabel ?? '',
          activeAt: activeAt ? new Date(activeAt).toISOString() : null,
          trial,
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create giveaway')
      router.push(`/giveaway/${data.id}?created=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4 pb-12">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-800">Configure Giveaway</h1>
        </div>

        {/* Dino picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Dino</label>
          {!session ? (
            <p className="text-sm text-gray-400">No session — go back and connect first.</p>
          ) : inventory.length === 0 ? (
            <p className="text-sm text-gray-400">Loading inventory…</p>
          ) : (
            <select
              value={invId ?? ''}
              onChange={e => setInvId(parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a dino…</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.growthLabel}
                  {item.onCooldown ? ' (cooldown)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Active at */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Active at (optional)</label>
          <input
            type="datetime-local"
            value={activeAt}
            onChange={e => setActiveAt(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">Leave empty to activate immediately.</p>
        </div>

        {/* Trial toggle */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trialEnabled}
              onChange={e => setTrialEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable typing trial</span>
          </label>
          {trialEnabled && (
            <div className="flex flex-col gap-1.5 pl-6">
              <label className="text-sm text-gray-600">
                Phrase the recipient must type exactly
              </label>
              <input
                type="text"
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                placeholder="e.g. I love Theri"
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !invId}
          className="py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {submitting ? 'Generating link…' : 'Generate Link'}
        </button>
      </div>
    </div>
  )
}
