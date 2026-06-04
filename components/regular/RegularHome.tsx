'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/backend/api'
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { Button } from '@/components/ui/button'
import { Gift, ExternalLink } from 'lucide-react'
import type { Giveaway } from '@/lib/types'

export function RegularHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  return (
    <main className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
      <ApiIdCard />

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Claimed Giveaways
        </p>

        <div className="border border-border rounded-xl p-2 flex flex-col gap-1.5">
          {giveaways.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">
              No claimed giveaways yet.
            </p>
          ) : (
            giveaways.map(g => (
              <div
                key={g.id}
                className="bg-muted/30 border border-border/60 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-border transition-colors cursor-pointer"
                onClick={() => router.push(`/giveaway/${g.id}`)}
              >
                <div className="w-9 h-9 bg-muted border border-border/50 rounded-lg flex items-center justify-center shrink-0">
                  <Gift size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{g.dino.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.dino.growthLabel}
                    {g.creator.username ? ` · from ${g.creator.username}` : ''}
                  </p>
                </div>
                <p className="text-xs font-mono text-muted-foreground/60 shrink-0">
                  {new Date(g.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={e => { e.stopPropagation(); window.open(`/giveaway/${g.id}`, '_blank') }}
                >
                  <ExternalLink size={13} />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
