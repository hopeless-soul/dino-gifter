'use client'
import { Pacifico } from 'next/font/google'
import { useState, useEffect } from 'react'

const pacifico = Pacifico({ weight: '400', subsets: ['latin'] })
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/use-auth-user'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Giveaway } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/lib/use-session'
import { SessionInput } from '@/components/SessionInput'
import { InventoryPanel } from '@/components/InventoryPanel'
import { ServerTabs } from '@/components/ServerTabs'
import { SlotsGrid } from '@/components/SlotsGrid'
import type { InventoryItem, SlotCard } from '@/lib/types'
import { Badge } from "@/components/ui/badge"

const statusBadgeClass: Record<string, string> = {
  not_processed: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-900/40 text-yellow-300',
  processed: 'bg-green-900/40 text-green-300',
  failed: 'bg-red-900/40 text-red-300',
}

// ── Regular user ──────────────────────────────────────────────────────────────

function RegularHome() {
  const [apiId, setApiId] = useState('')
  const [saving, setSaving] = useState(false)
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<{ apiId: string | null }>('/users/me')
      .then(({ data }) => { if (data.apiId) setApiId(data.apiId) })
      .catch(() => {})
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  async function saveApiId() {
    setSaving(true)
    try { await api.patch('/users', { apiId }) } finally { setSaving(false) }
  }

  return (
    <main className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your API ID</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={apiId}
            onChange={e => setApiId(e.target.value)}
            placeholder="Your in-game user ID"
          />
          <Button onClick={saveApiId} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

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
      .catch(() => {})
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
      <Tabs defaultValue="giveaways">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="giveaways">Giveaways</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => router.push('/giveaway/new')}>
            + New Giveaway
          </Button>
        </div>

        <TabsContent value="giveaways">
          {giveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No giveaways yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {giveaways.map(g => (
                <Card key={g.id}>
                  <CardContent className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{g.dino.name}</p>
                      <p className="text-sm text-muted-foreground">{g.dino.growthLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass[g.completionStatus] ?? 'bg-muted'}`}>
                        {g.completionStatus.replaceAll('_', ' ')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          <SessionInput
            value={session}
            onChange={setSession}
            onConnect={connectInventory}
            loading={loadingInv}
            error={invError}
          />
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
  const { user, logout } = useAuthUser()
  const router = useRouter()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <h1 className={`text-base text-foreground ${pacifico.className}`}>Dino Gifter</h1>
        <nav className="flex gap-4 text-sm ml-auto items-center">
          <Badge>{user.username}</Badge>
          <button
            onClick={async () => { await logout(); router.replace('/login') }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </nav>
      </header>

      {user.role === 'Regular' ? <RegularHome /> : <OperatorHome />}
    </div>
  )
}
