'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import api from '@/lib/backend/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/lib/hooks/use-session'
import { SessionInput } from '@/components/user/SessionInput'
import { InventoryPanel } from '@/components/game/InventoryPanel'
import { ServerTabs } from '@/components/game/ServerTabs'
import { SlotsGrid } from '@/components/game/SlotsGrid'
import { Navbar } from '@/components/layout/Navbar'
import type { InventoryItem, SlotCard } from '@/lib/types'
import { Badge } from "@/components/ui/badge"
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { Check, ClipboardCopy, ExternalLink, Gavel, Gift, Plus } from 'lucide-react'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"


const statusBadgeClass: Record<string, string> = {
  not_processed: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-900/40 text-yellow-300',
  processed: 'bg-green-900/40 text-green-300',
  failed: 'bg-red-900/40 text-red-300',
}

function Countdown({ activeAt }: { activeAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!activeAt) return
    const target = new Date(activeAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeAt])

  if (remaining === null) return null

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const label = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return <span className="text-xs font-mono text-muted-foreground">{label}</span>
}

// ── Regular user ──────────────────────────────────────────────────────────────

function RegularHome() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => { })
  }, [])

  return (
    <main className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <ApiIdCard />

      {/* Regular User - Giveaways */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Claimed Giveaways
        </h2>
        {giveaways.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claimed giveaways yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {giveaways.map(g => (
              <Card key={g.id}>
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{g.dino.name}</p>
                    <p className="text-sm text-muted-foreground">{g.dino.growthLabel}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

// ── Operator/Admin view ───────────────────────────────────────────────────────

function OperatorHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Inventory tab state
  const [session, setSession] = useSession()
  const [connected, setConnected] = useState(false)
  const [loadingInv, setLoadingInv] = useState(false)
  const [invError, setInvError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [activeServer, setActiveServer] = useState('1')

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway')
      .then(({ data }) => setGiveaways(data))
      .catch(() => { })
  }, [])

  async function connectInventory() {
    if (!session.trim()) return
    setLoadingInv(true)
    setInvError(null)
    try {
      const results: { slots: SlotCard[]; inventory: InventoryItem[] }[] = []
      for (const server of ['1', '2', '3']) {
        const res = await fetch(`/api/slots?server=${server}`, {
          headers: { 'x-user-session': session },
        })
        if (!res.ok) {
          const d = await res.json() as { error: string }
          throw new Error(res.status === 401 ? 'Session invalid or expired' : d.error)
        }
        results.push(await res.json())
      }
      setInventory(results[0].inventory)
      setServerSlots({ '1': results[0].slots, '2': results[1].slots, '3': results[2].slots })
      setConnected(true)
    } catch (e) {
      setInvError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoadingInv(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      <div className='flex gap-6 mb-6 sm:flex-col md:flex-row '>
        <SessionInput
          value={session}
          onChange={setSession}
          onConnect={connectInventory}
          loading={loadingInv}
          error={invError}
        />
        <ApiIdCard />
      </div>

      <Tabs defaultValue="giveaways">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="giveaways">Giveaways</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => router.push('/giveaway/new')}>
            <Plus size={12} /> New Giveaway
          </Button>
        </div>

        <TabsContent value="giveaways">
          {giveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No giveaways yet.</p>
          ) : (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Giveaways — {giveaways.length} items
              </h2>
              <ScrollArea className="h-128 w-full rounded-md border p-4">
                <ScrollBar />
                <div className="flex w-full flex-col gap-4 p-2 overflow-y-auto">
                  {giveaways.map((g, i) => (
                    <Item className='w-full' variant='muted' key={g.id} >
                      <HoverCard openDelay={10} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <ItemMedia variant='image' style={{ background: 'var(--muted)' }}>
                            <Gift size='21' />
                          </ItemMedia>
                        </HoverCardTrigger>
                        <HoverCardContent className="flex w-72 flex-col gap-0.5 ml-56">
                          <div className="font-semibold font-[12px] mb-2">{g.dino.name}</div>
                          <div className='text-xs text-muted-foreground'>{g.id}</div>
                          <div className='flex gap-2 mt-1 text-xs text-muted-foreground' >
                            <div>
                              Trials:
                            </div>
                            {g.trials && g.trials.map((trial, i) => (<div style={{ transform: 'translateY(-2px)' }}><Badge variant='secondary'>{trial.type}</Badge> {g.trials && i < (g.trials.length - 1) && (<span>&nbsp;→</span>)}</div>))}
                            {!g.trials && <p className='italic'>null</p>}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Gift Status:&nbsp;&nbsp;{g.completionStatus}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Created:&nbsp;&nbsp;{new Date(g.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Active:&nbsp;&nbsp;<Countdown activeAt={g.activeAt} />
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <ItemContent className='gap-1'>
                        <ItemTitle>
                          {g.dino.name}
                        </ItemTitle>
                        <ItemDescription>
                          {g.dino.growthLabel}
                        </ItemDescription>
                      </ItemContent>
                      <div className="py-3 px-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass[g.completionStatus] ?? 'bg-muted'}`}>
                            {g.completionStatus.replaceAll('_', ' ')}
                          </span>
                          <Countdown activeAt={g.activeAt} />
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ItemActions>
                        <Button size='icon' onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/giveaway/${g.id}`); setCopiedId(g.id); setTimeout(() => setCopiedId(null), 1500) }}>
                          <span className="relative w-4 h-4">
                            <ClipboardCopy size={16} className={`absolute inset-0 transition-all duration-200 ${copiedId === g.id ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                            <Check size={16} className={`absolute inset-0 transition-all duration-200 ${copiedId === g.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                          </span>
                        </Button>
                      </ItemActions>
                      <ItemActions>
                        <Button size='icon' variant='ghost' onClick={() => window.open(`/giveaway/${g.id}`, '_blank')}><ExternalLink size={16} /></Button>
                      </ItemActions>
                    </Item>
                  ))}
                </div>
              </ScrollArea>
            </section>
          )}
        </TabsContent>

        <TabsContent value="inventory">

          {connected && (
            <div className="flex flex-col gap-6 mt-4">
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Inventory — {inventory.length} items
                </h2>
                <Card className="overflow-hidden">
                  <InventoryPanel items={inventory} />
                </Card>
              </section>
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Server Slots
                </h2>
                <Card className="overflow-hidden">
                  <ServerTabs active={activeServer} onChange={setActiveServer} />
                  <SlotsGrid slots={serverSlots[activeServer] ?? []} />
                </Card>
              </section>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuthUser()

  if (!user) return null

  return (
    <div className="flex flex-col items-center mt-16 max-h-screen text-center bg-background">
      {user.role === 'Regular' ? <RegularHome /> : <OperatorHome />}
    </div>
  )
}
