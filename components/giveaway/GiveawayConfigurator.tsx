'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/hooks/use-session'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import api from '@/lib/backend/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ServerTabs } from '@/components/game/ServerTabs'
import { TrialConfigurator } from '@/components/giveaway/TrialConfigurator'
import type { InventoryItem, SlotCard, TrialData, Giveaway } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuthUser()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState('')

  const [activeServer, setActiveServer] = useState('1')
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set())
  const loadedServers = useRef(new Set<string>())

  const [activeAt, setActiveAt] = useState('')
  const [trialsEnabled, setTrialsEnabled] = useState(false)
  const [trials, setTrials] = useState<TrialData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway')
      .then(({ data }) => {
        const blocked = new Set<string>()
        data.forEach(g => {
          if (!g.recipient && !g.isCanceled && g.server && g.slot) {
            blocked.add(`${g.server}-${g.slot}`)
          }
        })
        setBlockedSlots(blocked)
      })
      .catch(() => {})
  }, [])

  const fetchServerSlots = useCallback(async (server: string) => {
    if (!session || loadedServers.current.has(server)) return
    loadedServers.current.add(server)
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/slots?server=${server}`, {
        headers: { 'x-user-session': session },
      })
      if (res.ok) {
        const data = await res.json() as { slots: SlotCard[] }
        setServerSlots(prev => ({ ...prev, [server]: data.slots }))
      } else {
        loadedServers.current.delete(server)
      }
    } catch {
      loadedServers.current.delete(server)
    } finally {
      setLoadingSlots(false)
    }
  }, [session])

  useEffect(() => { fetchServerSlots(activeServer) }, [activeServer, fetchServerSlots])

  const autoSlot = (serverSlots[activeServer] ?? []).find(
    s => s.isEmpty && !blockedSlots.has(`${activeServer}-${s.slotNumber}`)
  ) ?? null

  const selectedItem = inventory.find(i => i.id === parseInt(invId, 10))

  async function submit() {
    if (!invId) { setError('Select a dino.'); return }
    if (!autoSlot) { setError('No available slot on this server — all are reserved.'); return }
    if (trialsEnabled && trials.length === 0) { setError('Add at least one trial or disable Enable Trials.'); return }
    if (!selectedItem) { setError('Selected dino is no longer available.'); return }
    if (!session) { setError('No game session — connect in Inventory tab first.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const moveRes = await fetch('/api/move-to-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-session': session },
        body: JSON.stringify({ server: activeServer, invId: selectedItem.id, dinoName: selectedItem.name }),
      })
      if (!moveRes.ok) {
        const body = await moveRes.json() as { error?: string }
        setError(body.error ?? 'Failed to move dino to server.')
        setSubmitting(false)
        return
      }
      const { slotNumber } = await moveRes.json() as { slotNumber: number }

      const { data } = await api.post<{ id: string }>('/giveaway', {
        dino: {
          id: String(selectedItem.id),
          name: selectedItem.name,
          growthLabel: selectedItem.growthLabel,
          server: activeServer,
          slot: String(slotNumber),
        },
        activeAt: activeAt ? new Date(activeAt).toISOString() : null,
        trials: trialsEnabled && trials.length > 0 ? trials : null,
        server: activeServer,
        slot: String(slotNumber),
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
      <div className="flex gap-4 w-full max-w-6xl items-stretch">

        {/* Config card — fixed width, Generate Link pinned to bottom */}
        <Card className="w-60 shrink-0 flex flex-col">
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
              <CardTitle className="text-base">Configure Giveaway</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-2 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label>Dino</Label>
              {!session ? (
                <p className="text-sm text-muted-foreground">No game session — connect in Inventory tab first.</p>
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

            {autoSlot !== null && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground mb-0.5">Auto-selected slot</p>
                <p className="font-medium">Server {activeServer} · Slot {autoSlot.slotNumber}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Active at (optional)</Label>
              <Input
                type="datetime-local"
                value={activeAt}
                onChange={e => setActiveAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to activate immediately.</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="trials"
                checked={trialsEnabled}
                onCheckedChange={setTrialsEnabled}
              />
              <Label htmlFor="trials" className="cursor-pointer">Enable Trials</Label>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* Pin Generate Link to bottom */}
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !invId || !autoSlot}
              size="lg"
              className="w-full mt-auto"
            >
              {submitting ? 'Generating link…' : 'Generate Link'}
            </Button>
          </CardContent>
        </Card>

        {/* Slots card */}
        <Card className="flex-1 min-w-0 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Server Slots</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {!session ? (
              <p className="text-sm text-muted-foreground px-4 py-4">No game session — connect first.</p>
            ) : (
              <>
                <ServerTabs active={activeServer} onChange={setActiveServer} />
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground px-4 py-4">Loading…</p>
                ) : (serverSlots[activeServer] ?? []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                    {serverSlots[activeServer].map(slot => {
                      const isBlocked = blockedSlots.has(`${activeServer}-${slot.slotNumber}`)
                      const isAuto = autoSlot?.slotNumber === slot.slotNumber
                      return (
                        <div
                          key={slot.slotNumber}
                          className={cn(
                            'border rounded-lg p-3 text-sm select-none',
                            isBlocked
                              ? 'border-destructive/30 bg-destructive/10 text-muted-foreground'
                              : isAuto
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : slot.isEmpty
                                  ? 'border-dashed border-border/50 text-muted-foreground bg-muted/20'
                                  : 'border-border bg-card'
                          )}
                        >
                          <p className="text-xs text-muted-foreground mb-1">Slot {slot.slotNumber}</p>
                          {slot.isEmpty ? (
                            <p className="italic text-xs">Empty</p>
                          ) : (
                            <>
                              <p className="font-medium truncate text-card-foreground">{slot.name}</p>
                              <p className="text-muted-foreground text-xs mt-0.5">{slot.growthLabel}</p>
                            </>
                          )}
                          {isBlocked && <p className="text-xs text-destructive/70 mt-1">Active giveaway</p>}
                          {isAuto && <p className="text-xs text-primary mt-1">← selected</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground px-4 py-4">No slots found.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Trial card — animated width slide */}
        <div
          style={{
            width: trialsEnabled ? '320px' : '0px',
            overflow: 'hidden',
            transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
          }}
        >
          <Card className="flex flex-col h-full" style={{ minWidth: '320px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trial Configurator</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <TrialConfigurator trials={trials} onChange={setTrials} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
