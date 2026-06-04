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
    <div className="min-h-[calc(100vh-64px)] bg-background flex flex-col md:flex-row items-start justify-center gap-4 px-4 py-8 mt-16">

      {/* Left column */}
      <div className="flex flex-col gap-4 w-full md:w-80 shrink-0">

        {/* Hero card */}
        <Card>
          <CardHeader className="text-center pb-0 pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {giveaway.creator.username ?? '—'} gives away
            </p>
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5a4af4 0%, #7c5cbf 100%)' }}
              >
                <Gift size={38} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{giveaway.dino.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {giveaway.dino.growthLabel}
              {giveaway.server ? ` · ${giveaway.server}` : ''}
            </p>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pt-5 pb-5">
            {redeemed ? (
              <Button
                disabled
                size="lg"
                className="w-full opacity-40"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                🎁 Redeemed
              </Button>
            ) : (
              <Button
                onClick={redeem}
                disabled={redeemDisabled}
                size="lg"
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono break-all text-center"
                title="Click to copy"
              >
                <span className="relative w-3 h-3 flex-shrink-0">
                  <ClipboardCopy size={12} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-0 scale-75' : 'opacity-100'}`} />
                  <Check size={12} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-100' : 'opacity-0 scale-75'}`} />
                </span>
                {shareUrl}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Status card — fixed height, no layout jump */}
        <Card className="relative overflow-hidden" style={{ minHeight: '160px' }}>

          {/* State 1: Countdown */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-300 ${showCountdown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Available in</p>
            {giveaway.activeAt && (
              <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
            )}
          </div>

          {/* State 2: Trial progress */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 transition-opacity duration-300 ${showTrialProgress ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {currentTrial ? currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(0, 6) + ' Trial' : ''}
              </p>
              <p className="text-sm font-mono mt-0.5 text-foreground">{trialIndex + 1} / {trialCount}</p>
            </div>
            <div className="flex gap-1 w-full">
              {Array.from({ length: trialCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= trialIndex ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>

          {/* State 3: All trials done (or no trials) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 transition-opacity duration-300 ${showTrialsDone ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {trialCount > 0 ? (
              <>
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Done</p>
                  <p className="text-sm font-mono mt-0.5 text-foreground">{trialCount} / {trialCount}</p>
                </div>
                <div className="flex gap-1 w-full">
                  {Array.from({ length: trialCount }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">All trials complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ready to redeem</p>
            )}
          </div>

          {/* State 4: Claimed */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${showClaimed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: showClaimed ? 'linear-gradient(135deg, #1a1040 0%, #0d1530 100%)' : undefined }}
          >
            <Trophy size={32} className="text-purple-400" />
            <p className="font-semibold text-white text-sm">{giveaway.recipient?.username ?? '—'}</p>
            <p className="text-xs text-purple-300">Claimed this gift</p>
          </div>

        </Card>
      </div>

      {/* Right column: trial content */}
      {trialCount > 0 && active && currentTrial && !trialsComplete && (
        <Card className="flex-1 w-full flex flex-col min-h-[400px] md:self-stretch">
          <CardHeader className="text-center pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(1)} Trial
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4 items-center justify-center">
            {renderTrial(currentTrial)}
          </CardContent>
          {trialCount > 1 && (
            <div className="flex justify-center gap-1.5 pb-4">
              {Array.from({ length: trialCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === trialIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
