// components/PusherProvider.tsx
'use client'
import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import api from '@/lib/api'
import { getAuthUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { moveAndGift } from '@/lib/redeem'
import type { DinoData } from '@/lib/types'

interface GiftDinoPayload {
  giveawayId: string
  dino: DinoData
  recipientApiId: string
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const pusherRef = useRef<Pusher | null>(null)

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

    channel.bind('gift_dino', async (payload: GiftDinoPayload) => {
      const session = loadSession()
      if (!session) return
      await moveAndGift(
        session,
        parseInt(payload.dino.id, 10),
        payload.dino.name,
        payload.recipientApiId,
      )
    })

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [])

  return <>{children}</>
}
