'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/backend/api'
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Archive, ExternalLink, Gift, Loader2, PartyPopper, Search, TriangleAlert } from 'lucide-react'
import type { Giveaway } from '@/lib/types'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Countdown } from '@/components/giveaway/CountdownTimer'

const LS_KEY = 'dino-gifter:search-username'

export function RegularHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  const [searchQuery, setSearchQuery] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_KEY) ?? '') : ''
  )
  const [searchResults, setSearchResults] = useState<Giveaway[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data.reverse()))
      .catch(() => { })
  }, [])

  function updateQuery(v: string) {
    setSearchQuery(v)
    localStorage.setItem(LS_KEY, v)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const { data } = await api.get<Giveaway[]>('/giveaway/search', {
        params: { usernameSearch: searchQuery.trim() },
      })
      setSearchResults(data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="max-w-2xl w-full mx-auto p-4">
      {/* Top cards */}
      <div className='flex gap-6 mb-6 sm:flex-col md:flex-row'>
        <ApiIdCard />
      </div>

      <Tabs defaultValue="claimed">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="claimed">Claimed</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="claimed">
          <section className="mt-3">

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-left" style={{ color: '#444' }}>
              Claimed Giveaways — {giveaways.length} items
            </h2>
            <ScrollArea className="h-128 w-full rounded-xl border-border border">
              <div className="p-2 flex flex-col gap-3">
                {giveaways.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No claimed giveaways yet.
                  </p>
                ) : (

                  giveaways.map(g => (
                    <Item
                      key={g.id}
                      className="bg-muted/30 border border-border/60 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-border transition-colors cursor-pointer"
                      onClick={() => router.push(`/giveaway/${g.id}`)}
                      style={g.isCanceled ? { opacity: 0.4 } : undefined}
                    >
                      <ItemMedia variant='image' style={{
                        background: g.isCanceled && g.completionStatus === 'processed'
                          ? 'color-mix(in srgb, #22c55e 30%, transparent)'
                          : g.isCanceled
                            ? 'var(--muted)'
                            : g.completionStatus === 'failed'
                              ? 'color-mix(in srgb, #ef4444 30%, transparent)'
                              : g.completionStatus === 'processed'
                                ? 'color-mix(in srgb, #22c55e 30%, transparent)'
                                : 'var(--muted)',
                      }}>
                        {g.isCanceled
                          ? <Archive size='21' className="text-white" />
                          : g.completionStatus === 'failed'
                            ? <TriangleAlert size='21' className="text-white" />
                            : g.completionStatus === 'processed'
                              ? <PartyPopper size='21' className="text-white" />
                              : <Gift size='21' className="text-white" />}
                      </ItemMedia>
                      <ItemContent className="flex-1 min-w-0">
                        <ItemTitle className="text-sm font-semibold text-foreground truncate">{g.dino.name}</ItemTitle>
                        <ItemDescription className="text-xs text-muted-foreground mt-0.5">
                          {g.dino.growthLabel}
                          &nbsp;· {g.dino.server ? `Server ${g.dino.server}` : 'null'}
                          &nbsp;· from {g.creator.username ? `${g.creator.username}` : ''}
                        </ItemDescription>
                      </ItemContent>
                      <Countdown activeAt={g.activeAt} />
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
                    </Item>
                  ))
                )}
              </div>
            </ScrollArea>
          </section>
        </TabsContent>

        <TabsContent value="search">
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Creator username…"
              value={searchQuery}
              onChange={e => updateQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching
                ? <Loader2 size={14} className="animate-spin" />
                : <Search size={14} />}
              Search
            </Button>
          </div>
          <ScrollArea className="h-123 w-full rounded-xl border-border border mt-3">
            <div className="p-2 flex flex-col gap- ">
              {!searched ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Enter a username to find active giveaways.
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  No active giveaways found.
                </p>
              ) : (
                searchResults.map(g => (
                  <Item
                    key={g.id}
                    className="bg-muted/30 border border-border/60 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-border transition-colors cursor-pointer"
                    onClick={() => router.push(`/giveaway/${g.id}`)}
                  >
                    <ItemMedia variant='image' style={{
                      background: g.isCanceled && g.completionStatus === 'processed'
                        ? 'color-mix(in srgb, #22c55e 30%, transparent)'
                        : g.isCanceled
                          ? 'var(--muted)'
                          : g.completionStatus === 'failed'
                            ? 'color-mix(in srgb, #ef4444 30%, transparent)'
                            : g.completionStatus === 'processed'
                              ? 'color-mix(in srgb, #22c55e 30%, transparent)'
                              : 'var(--muted)',
                    }}>
                      {g.isCanceled
                        ? <Archive size='21' className="text-white" />
                        : g.completionStatus === 'failed'
                          ? <TriangleAlert size='21' className="text-white" />
                          : g.completionStatus === 'processed'
                            ? <PartyPopper size='21' className="text-white" />
                            : <Gift size='21' className="text-white" />}
                    </ItemMedia>
                    <ItemContent className="flex-1 min-w-0">
                      <ItemTitle className="text-sm font-semibold text-foreground truncate">{g.dino.name}</ItemTitle>
                      <ItemDescription className="text-xs text-muted-foreground mt-0.5">
                        {g.dino.growthLabel}
                        &nbsp;· {g.dino.server ? `Server ${g.dino.server}` : 'null'}
                        &nbsp;· from {g.creator.username ? `${g.creator.username}` : ''}
                      </ItemDescription>
                    </ItemContent>
                    <Countdown activeAt={g.activeAt} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={e => { e.stopPropagation(); window.open(`/giveaway/${g.id}`, '_blank') }}
                    >
                      <ExternalLink size={13} />
                    </Button>
                  </Item>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </main>
  )
}
