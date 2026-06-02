'use client'
import { useState } from 'react'
import { useSession } from '@/lib/use-session'
import { SessionInput } from '@/components/SessionInput'
import { InventoryPanel } from '@/components/InventoryPanel'
import { ServerTabs } from '@/components/ServerTabs'
import { SlotsGrid } from '@/components/SlotsGrid'
import { Card } from '@/components/ui/card'
import type { InventoryItem, SlotCard } from '@/lib/types'

export default function InventoryPage() {
  const [session, setSession] = useSession()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [activeServer, setActiveServer] = useState('1')

  async function connect() {
    if (!session.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Sequential fetches: ageofdino.ru uses server-side session context that
      // can race if multiple server-switches hit simultaneously for the same cookie.
      const results: { slots: SlotCard[]; inventory: InventoryItem[] }[] = []
      for (const server of ['1', '2', '3']) {
        const res = await fetch(`/api/slots?server=${server}`, {
          headers: { 'x-user-session': session },
        })
        if (!res.ok) {
          const data = await res.json() as { error: string }
          throw new Error(res.status === 401 ? 'Session invalid or expired' : data.error)
        }
        results.push(await res.json())
      }
      setInventory(results[0].inventory)
      setServerSlots({
        '1': results[0].slots,
        '2': results[1].slots,
        '3': results[2].slots,
      })
      setConnected(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <h1 className="text-base font-bold text-foreground">🦕 Dino Gifter</h1>
        <nav className="flex gap-4 text-sm text-muted-foreground ml-auto">
          <a href="/login" className="hover:text-foreground transition-colors">Login</a>
          <a href="/register" className="hover:text-foreground transition-colors">Register</a>
        </nav>
      </header>

      <SessionInput
        value={session}
        onChange={setSession}
        onConnect={connect}
        loading={loading}
        error={error}
      />

      {!connected && !loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Enter your UserSession cookie and click Connect.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Loading all servers…
        </div>
      )}

      {connected && (
        <main className="max-w-7xl mx-auto p-4 flex flex-col gap-6">
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
        </main>
      )}
    </div>
  )
}
