'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/use-auth-user'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Giveaway } from '@/lib/types'

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

// ── Placeholder for Operator view (Task 10) ───────────────────────────────────

function OperatorHome() {
  return <div className="p-4 text-muted-foreground text-sm">Operator view — coming in next task</div>
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, logout } = useAuthUser()
  const router = useRouter()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <h1 className="text-base font-bold text-foreground">🦕 Dino Gifter</h1>
        <nav className="flex gap-4 text-sm ml-auto items-center">
          <span className="text-muted-foreground">{user.username}</span>
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
