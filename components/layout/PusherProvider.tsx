'use client'
import { useEffect } from 'react'
import Pusher from 'pusher-js'
import api from '@/lib/backend/api'
import { getAuthUser } from '@/lib/backend/auth'
import { loadSession } from '@/lib/backend/session'
import type { GiftDinoPayload } from '@/lib/types'

// Module-level set: survives re-renders and guards against Pusher duplicate delivery
const inFlight = new Set<string>()

async function handleGiftDino(payload: GiftDinoPayload) {
  if (inFlight.has(payload.giveawayId)) return
  inFlight.add(payload.giveawayId)
  const session = loadSession()
  if (!session) {
    console.warn('[gift_dino] no game session — cannot process')
    return
  }

  let completionStatus: 'processed' | 'failed' = 'failed'

  try {
    const res = await fetch('/api/send-gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-session': session },
      body: JSON.stringify({
        server: payload.server,
        slot: payload.slot,
        recipientApiId: payload.recipientApiId,
      }),
    })

    if (res.ok) {
      completionStatus = 'processed'
    } else {
      const body = await res.json() as { error?: string }
      console.error('[gift_dino] send-gift failed:', body.error)
    }
  } catch (err) {
    console.error('[gift_dino] network error:', err)
  }

  try {
    await api.patch(`/giveaway/${payload.giveawayId}`, { completionStatus })
  } catch (err) {
    console.error('[gift_dino] failed to update giveaway status:', err)
  }
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const user = getAuthUser()
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!user || !key || !cluster) return

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        customHandler: async ({ socketId, channelName }, callback) => {
          try {
            const { data } = await api.post('/pusher/auth', {
              socket_id: socketId,
              channel_name: channelName,
            })
            callback(null, data)
          } catch {
            callback(new Error('Pusher auth failed'), null)
          }
        },
      },
    })

    const channel = pusher.subscribe(`private-user-${user.id}`)

    channel.bind('gift_dino', (payload: GiftDinoPayload) => {
      void handleGiftDino(payload)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
    }
  }, [])

  return <>{children}</>
}
