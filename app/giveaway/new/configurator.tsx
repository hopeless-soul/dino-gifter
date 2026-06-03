'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import { useAuthUser } from '@/lib/use-auth-user'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrialConfigurator } from '@/components/TrialConfigurator'
import type { InventoryItem, TrialData } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuthUser()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState('')
  const [activeAt, setActiveAt] = useState('')
  const [trialsEnabled, setTrialsEnabled] = useState(false)
  const [trials, setTrials] = useState<TrialData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Role guard — Regular users cannot create giveaways
  useEffect(() => {
    if (user && user.role === 'Regular') router.replace('/')
  }, [user, router])

  useEffect(() => {
    const id = params.get('invId')
    if (id) setInvId(id)
  }, [params])

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

  const selectedItem = inventory.find(i => i.id === parseInt(invId, 10))

  async function submit() {
    if (!invId) { setError('Select a dino.'); return }
    if (trialsEnabled && trials.length === 0) { setError('Add at least one trial or uncheck Enable Trials.'); return }
    if (!selectedItem) { setError('Selected dino is no longer available.'); setSubmitting(false); return }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post<{ id: string }>('/giveaway', {
        dino: {
          id: String(selectedItem.id),
          name: selectedItem.name,
          growthLabel: selectedItem.growthLabel,
        },
        activeAt: activeAt ? new Date(activeAt).toISOString() : null,
        trials: trialsEnabled && trials.length > 0 ? trials : null,
      })
      setSubmitting(false)
      router.push(`/giveaway/${data.id}`)
    } catch {
      setError('Failed to create giveaway. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4 pb-12">
      <div className={trialsEnabled ? 'flex gap-4 w-full max-w-3xl' : 'w-full max-w-md'}>

        {/* Left: giveaway config */}
        <Card className={trialsEnabled ? 'flex-1' : 'w-full'}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
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
                <p className="text-sm text-muted-foreground">No game session — go to Inventory tab and connect first.</p>
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

            {/* Trials toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="trials"
                checked={trialsEnabled}
                onCheckedChange={checked => setTrialsEnabled(!!checked)}
              />
              <Label htmlFor="trials" className="cursor-pointer">Enable Trials</Label>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !invId}
              size="lg"
              className="w-full"
            >
              {submitting ? 'Generating link…' : 'Generate Link'}
            </Button>
          </CardContent>
        </Card>

        {/* Right: trial configurator (only when trialsEnabled) */}
        {trialsEnabled && (
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trial Configurator</CardTitle>
            </CardHeader>
            <CardContent>
              <TrialConfigurator trials={trials} onChange={setTrials} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
