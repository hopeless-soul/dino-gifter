import type { NextRequest } from 'next/server'
import { getGiveaway } from '@/lib/mock-store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const g = getGiveaway(id)
  if (!g) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    id: g.id,
    dinoName: g.dinoName,
    growthLabel: g.growthLabel,
    activeAt: g.activeAt,
    trial: g.trial,
    redeemed: g.redeemed,
  })
}
