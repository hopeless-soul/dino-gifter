'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CountdownTimer } from '@/components/CountdownTimer'
import { TypingTrial } from '@/components/TypingTrial'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PublicGiveaway } from '@/lib/types'

export default function GiveawayPage() {
  const { id } = useParams<{ id: string }>()

  const [giveaway, setGiveaway] = useState<PublicGiveaway | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [trialPassed, setTrialPassed] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    fetch(`/api/giveaways/${id}`)
      .then(r => r.json())
      .then((data: PublicGiveaway & { error?: string }) => {
        if (data.error) { setFetchError(data.error); return }
        setGiveaway(data)
        setRedeemed(data.redeemed)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) {
          setActive(true)
        }
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    const res = await fetch(`/api/giveaways/${id}/redeem`, { method: 'POST' })
    const data = await res.json() as { ok?: boolean; error?: string }
    if (res.ok) {
      setRedeemed(true)
    } else {
      setRedeemError(data.error ?? 'Redemption failed')
    }
    setRedeeming(false)
  }

  const showRedeemButton = active && (!giveaway?.trial || trialPassed) && !redeemed

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dino Giveaway
          </p>
          <h1 className="text-2xl font-bold text-foreground">{giveaway.dinoName}</h1>
          <p className="text-muted-foreground mt-1">{giveaway.growthLabel}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 items-center text-center">
          {redeemed ? (
            <p className="text-success font-medium text-sm">
              This giveaway has already been claimed.
            </p>
          ) : (
            <>
              {giveaway.activeAt && !active && (
                <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
              )}

              {active && giveaway.trial && !trialPassed && (
                <TypingTrial
                  phrase={giveaway.trial.phrase}
                  onSuccess={() => setTrialPassed(true)}
                />
              )}

              {showRedeemButton && (
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
