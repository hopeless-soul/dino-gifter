// components/layout/PusherProvider.tsx
'use client'
import { useEffect } from 'react'
import Pusher from 'pusher-js'
import api from '@/lib/backend/api'
import { getAuthUser } from '@/lib/backend/auth'
import { GiftDinoPayload } from '@/lib/types'

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
      console.log('[gift_dino]', payload)
      console.log(payload)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
    }
  }, [])

  return <>{children}</>
}
