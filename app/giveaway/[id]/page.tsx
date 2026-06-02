'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CountdownTimer } from '@/components/CountdownTimer'
import { TypingTrial } from '@/components/TypingTrial'
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
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{fetchError}</p>
      </div>
    )
  }

  if (!giveaway) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-6 text-center shadow-sm">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Dino Giveaway
          </p>
          <h1 className="text-2xl font-bold text-gray-800">{giveaway.dinoName}</h1>
          <p className="text-gray-500 mt-1">{giveaway.growthLabel}</p>
        </div>

        {/* Body */}
        {redeemed ? (
          <p className="text-green-600 font-medium text-sm">
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
              <button
                onClick={redeem}
                disabled={redeeming}
                className="py-3 px-8 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {redeeming ? 'Sending…' : '🎁 Redeem'}
              </button>
            )}

            {redeemError && (
              <p className="text-red-500 text-sm">{redeemError}</p>
            )}
          </>
        )}

        {/* Share URL */}
        {shareUrl && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-1">Share this link</p>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="font-mono text-xs break-all text-gray-500 hover:text-blue-600 transition-colors"
              title="Click to copy"
            >
              {shareUrl}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
