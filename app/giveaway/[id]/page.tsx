'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/backend/api'
import { CountdownTimer } from '@/components/giveaway/CountdownTimer'
import { TypingTrial } from '@/components/trials/TypingTrial'
import { MathTrialPlayer } from '@/components/trials/MathTrialPlayer'
import { PuzzleTrialPlayer } from '@/components/trials/PuzzleTrialPlayer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway, TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'
import { Gift, Trophy, ClipboardCopy, Check } from 'lucide-react'

function trialHeading(type: string): string {
  if (type === 'typing') return 'Type the phrase'
  if (type === 'math') return 'Solve the expression'
  return 'Solve the puzzle'
}

export default function GiveawayPage() {
  const { id } = useParams<{ id: string }>()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [trialIndex, setTrialIndex] = useState(0)
  const [trialsComplete, setTrialsComplete] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    api.get<Giveaway>(`/giveaway/${id}`)
      .then(({ data }) => {
        setGiveaway(data)
        if (data.isCanceled) { setFetchError('This giveaway has been canceled.'); return }
        if (data.completionStatus !== 'not_processed') setRedeemed(true)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) setActive(true)
        if (!data.trials || data.trials.length === 0) setTrialsComplete(true)
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  const advanceTrial = useCallback(() => {
    const total = giveaway?.trials?.length ?? 0
    setTrialIndex(i => {
      if (i + 1 >= total) { setTrialsComplete(true); return i }
      return i + 1
    })
  }, [giveaway])

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      await api.post(`/giveaway/${id}`)
      const { data } = await api.get<Giveaway>(`/giveaway/${id}`)
      setGiveaway(data)
      setRedeemed(true)
    } catch {
      setRedeemError('Redemption failed. Try again.')
    } finally {
      setRedeeming(false)
    }
  }

  function copyShare() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function renderTrial(trial: TrialData) {
    if (trial.type === 'typing') return <TypingTrial phrase={(trial.data as TypingTrialData).phrase} onSuccess={advanceTrial} />
    if (trial.type === 'math') return <MathTrialPlayer data={trial.data as MathTrialData} onSuccess={advanceTrial} />
    return <PuzzleTrialPlayer data={trial.data as PuzzleTrialData} onSuccess={advanceTrial} />
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }
  if (fetchError) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive text-sm">{fetchError}</p></div>
  }
  if (!giveaway) return null

  const trialCount = giveaway.trials?.length ?? 0
  const currentTrial = giveaway.trials?.[trialIndex]

  const redeemDisabled = redeeming || !active || (trialCount > 0 && !trialsComplete)

  const showCountdown = !active
  const showTrialProgress = active && trialCount > 0 && !trialsComplete
  const showTrialsDone = active && (trialCount === 0 || trialsComplete) && !redeemed
  const showClaimed = redeemed

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background flex items-start justify-center px-6 py-8 mt-16">
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl items-stretch">

        {/* Left column — 320px */}
        <div className="flex flex-col gap-4 w-full md:w-80 shrink-0">

          {/* Hero card */}
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
                from {giveaway.creator.username ?? '—'}
              </p>
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #2a1a4a, #1a2a4a)' }}
              >
                <Gift size={32} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">{giveaway.dino.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {giveaway.dino.growthLabel}{giveaway.server ? ` · ${giveaway.server}` : ''}
                </p>
              </div>

              {redeemed ? (
                <Button
                  disabled
                  className="w-full"
                  style={{ background: '#2a1a4a', color: '#9a8aff', opacity: 0.7 }}
                >
                  ✓ Claimed
                </Button>
              ) : (
                <Button
                  onClick={redeem}
                  disabled={redeemDisabled}
                  className="w-full"
                  variant={redeemDisabled ? 'secondary' : 'default'}
                >
                  {redeeming ? 'Sending…' : '🎁 Redeem'}
                </Button>
              )}

              {redeemError && <p className="text-destructive text-sm text-center">{redeemError}</p>}

              {shareUrl && (
                <button
                  onClick={copyShare}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/40 border-t border-border/30 pt-2 w-full hover:text-muted-foreground/60 transition-colors font-mono truncate"
                  title="Click to copy"
                >
                  <span className="relative w-3.5 h-3.5 flex-shrink-0">
                    <ClipboardCopy size={11} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-0 scale-75' : 'opacity-100'}`} />
                    <Check size={11} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-100' : 'opacity-0 scale-75'}`} />
                  </span>
                  <span className="truncate">{shareUrl}</span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Status card — 144px */}
          <Card className="relative overflow-hidden" style={{ height: '144px' }}>

            {/* State 1: Countdown */}
            <div className={`absolute inset-0 flex flex-col justify-center gap-1.5 px-6 py-5 transition-opacity duration-300 ${showCountdown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Available in</p>
              {giveaway.activeAt && (
                <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
              )}
              <p className="text-xs text-muted-foreground/30">Unlocks automatically</p>
            </div>

            {/* State 2: Trial progress */}
            <div className={`absolute inset-0 flex flex-col justify-center gap-2 px-6 py-5 transition-opacity duration-300 ${showTrialProgress ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground/80">
                  {currentTrial ? currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(1) + ' Trial' : ''}
                </span>
                <span className="text-xs text-muted-foreground/60">{trialIndex + 1} / {trialCount}</span>
              </div>
              <div className="flex gap-1.5 w-full">
                {Array.from({ length: trialCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      i < trialIndex ? 'bg-primary' : i === trialIndex ? 'bg-primary/50' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest">Complete all trials to unlock</p>
            </div>

            {/* State 3: All trials done */}
            <div className={`absolute inset-0 flex flex-col justify-center gap-2 px-6 py-5 transition-opacity duration-300 ${showTrialsDone ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {trialCount > 0 ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-foreground/80">Done</span>
                    <span className="text-xs text-muted-foreground/60">{trialCount} / {trialCount}</span>
                  </div>
                  <div className="flex gap-1.5 w-full">
                    {Array.from({ length: trialCount }).map((_, i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/40 uppercase tracking-widest">Complete all trials to unlock</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Ready to redeem</p>
              )}
            </div>

            {/* State 4: Claimed */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${showClaimed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{ background: showClaimed ? 'linear-gradient(135deg, #1a0a2e 0%, #0f1a2e 100%)' : undefined }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Trophy size={24} className="text-purple-400" />
              </div>
              <p className="font-bold text-white text-base">{giveaway.recipient?.username ?? '—'}</p>
              <p className="text-sm text-white/45">Claimed this gift</p>
            </div>

          </Card>
        </div>

        {/* Right column: trial content */}
        {trialCount > 0 && active && currentTrial && !trialsComplete && (
          <Card className="flex-1 w-full flex flex-col min-h-[300px] md:self-stretch">
            <CardHeader className="pb-2 pt-5 px-6">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
                {currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(1)} Trial · {trialIndex + 1} of {trialCount}
              </p>
              <p className="text-base font-semibold text-foreground/80 mt-1">
                {trialHeading(currentTrial.type)}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4 px-6 pb-6">
              {renderTrial(currentTrial)}
            </CardContent>
            {trialCount > 1 && (
              <div className="flex justify-center gap-2 pb-4">
                {Array.from({ length: trialCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === trialIndex ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
