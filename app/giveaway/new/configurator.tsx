'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InventoryItem, TypingTrial } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState<string>('')
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
    if (id) setInvId(id)
  }, [params])

  const selectedItem = inventory.find(i => i.id === parseInt(invId, 10))

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
          invId: parseInt(invId, 10),
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
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              aria-label="Back"
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              ←
            </Button>
            <CardTitle className="text-lg">Configure Giveaway</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 pt-2">
          {/* Dino picker */}
          <div className="flex flex-col gap-1.5">
            <Label>Dino</Label>
            {!session ? (
              <p className="text-sm text-muted-foreground">No session — go back and connect first.</p>
            ) : inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading inventory…</p>
            ) : (
              <Select value={invId} onValueChange={setInvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dino…" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} — {item.growthLabel}
                      {item.onCooldown ? ' (cooldown)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Active at */}
          <div className="flex flex-col gap-1.5">
            <Label>Active at (optional)</Label>
            <Input
              type="datetime-local"
              value={activeAt}
              onChange={e => setActiveAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty to activate immediately.</p>
          </div>

          {/* Trial toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="trial"
                checked={trialEnabled}
                onCheckedChange={checked => setTrialEnabled(!!checked)}
              />
              <Label htmlFor="trial" className="cursor-pointer">Enable typing trial</Label>
            </div>
            {trialEnabled && (
              <div className="flex flex-col gap-1.5 pl-6">
                <Label className="text-muted-foreground font-normal">
                  Phrase the recipient must type exactly
                </Label>
                <Input
                  type="text"
                  value={phrase}
                  onChange={e => setPhrase(e.target.value)}
                  placeholder="e.g. I love Theri"
                />
              </div>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            onClick={submit}
            disabled={submitting || !invId}
            size="lg"
            className="w-full"
          >
            {submitting ? 'Generating link…' : 'Generate Link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
