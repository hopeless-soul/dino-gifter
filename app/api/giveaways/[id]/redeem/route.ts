import type { NextRequest } from 'next/server'
import { getGiveaway, markRedeemed } from '@/lib/mock-store'
import { moveAndGift } from '@/lib/redeem'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const g = getGiveaway(id)

  if (!g) return Response.json({ error: 'Not found' }, { status: 404 })
  if (g.redeemed) return Response.json({ error: 'Already redeemed' }, { status: 409 })
  if (g.activeAt && new Date(g.activeAt) > new Date()) {
    return Response.json({ error: 'Giveaway is not yet active' }, { status: 403 })
  }

  // Mark redeemed BEFORE the network call to prevent double-spend
  markRedeemed(id)

  const result = await moveAndGift(g.session, g.invId, g.dinoName, g.recipientFriendId)
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 })

  return Response.json({ ok: true })
}
