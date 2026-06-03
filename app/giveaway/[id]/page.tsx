'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { CountdownTimer } from '@/components/CountdownTimer'
import { TypingTrial } from '@/components/TypingTrial'
import { MathTrialPlayer } from '@/components/trials/MathTrialPlayer'
import { PuzzleTrialPlayer } from '@/components/trials/PuzzleTrialPlayer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway, TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'

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
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    api.get<Giveaway>(`/giveaway/${id}`)
      .then(({ data }) => {
        setGiveaway(data)
        if (data.completionStatus !== 'not_processed') setRedeemed(true)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) setActive(true)
        if (!data.trials || data.trials.length === 0) setTrialsComplete(true)
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  function advanceTrial() {
    const total = giveaway?.trials?.length ?? 0
    if (trialIndex + 1 >= total) {
      setTrialsComplete(true)
    } else {
      setTrialIndex(i => i + 1)
    }
  }

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      await api.post(`/giveaway/${id}`)
      setRedeemed(true)
    } catch {
      setRedeemError('Redemption failed. Try again.')
    } finally {
      setRedeeming(false)
    }
  }

  function renderTrial(trial: TrialData) {
    if (trial.type === 'typing') {
      return <TypingTrial phrase={(trial.data as TypingTrialData).phrase} onSuccess={advanceTrial} />
    }
    if (trial.type === 'math') {
      return <MathTrialPlayer data={trial.data as MathTrialData} onSuccess={advanceTrial} />
    }
    return <PuzzleTrialPlayer data={trial.data as PuzzleTrialData} onSuccess={advanceTrial} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">{fetchError}</p>
      </div>
    )
  }

  if (!giveaway) return null

  const currentTrial = giveaway.trials?.[trialIndex]
  const trialCount = giveaway.trials?.length ?? 0
  const showRedeem = active && trialsComplete && !redeemed

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dino Giveaway
          </p>
          <h1 className="text-2xl font-bold text-foreground">{giveaway.dino.name}</h1>
          <p className="text-muted-foreground mt-1">{giveaway.dino.growthLabel}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 items-center text-center">
          {redeemed ? (
            <p className="text-sm font-medium" style={{ color: 'var(--color-success, #22c55e)' }}>
              {giveaway.completionStatus !== 'not_processed' && !redeemError
                ? 'This giveaway has already been claimed.'
                : 'Claimed! The dino is on its way.'}
            </p>
          ) : (
            <>
              {giveaway.activeAt && !active && (
                <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
              )}

              {active && currentTrial && !trialsComplete && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Trial {trialIndex + 1} of {trialCount}
                  </p>
                  {renderTrial(currentTrial)}
                </div>
              )}

              {showRedeem && (
                <Button
                  onClick={redeem}
                  disabled={redeeming}
                  variant="success"
                  size="lg"
                  className="px-8"
                >
                  {redeeming ? 'Sending…' : '🎁 Redeem'}
                </Button>
              )}

              {redeemError && (
                <p className="text-destructive text-sm">{redeemError}</p>
              )}
            </>
          )}

          {shareUrl && (
            <div className="border-t border-border pt-4 w-full">
              <p className="text-xs text-muted-foreground mb-1">Share this link</p>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="font-mono text-xs break-all text-muted-foreground hover:text-primary transition-colors"
                title="Click to copy"
              >
                {shareUrl}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
