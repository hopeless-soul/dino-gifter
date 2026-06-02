import type { NextRequest } from 'next/server'
import { createGiveaway } from '@/lib/mock-store'
import { FRIENDS } from '@/lib/friends'
import type { TypingTrial } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    session?: string
    invId?: number
    dinoName?: string
    growthLabel?: string
    activeAt?: string | null
    trial?: TypingTrial | null
  }

  if (!body.session || !body.dinoName || body.invId == null) {
    return Response.json({ error: 'Missing required fields: session, invId, dinoName' }, { status: 400 })
  }

  const id = createGiveaway({
    session: body.session,
    invId: body.invId,
    dinoName: body.dinoName,
    growthLabel: body.growthLabel ?? '',
    activeAt: body.activeAt ?? null,
    trial: body.trial ?? null,
    recipientFriendId: FRIENDS[0].id,
  })

  return Response.json({ id }, { status: 201 })
}
