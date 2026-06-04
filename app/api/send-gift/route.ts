import type { NextRequest } from 'next/server'
import { fetchSlotsPage, sendGift } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

export async function POST(request: NextRequest) {
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  const { server, slot, recipientApiId } = await request.json() as {
    server: string | null
    slot: string | null
    recipientApiId: string
  }

  if (!server || !slot) {
    return Response.json({ error: 'Dino has no server/slot assigned', slotMissing: true }, { status: 404 })
  }

  const slotNumber = parseInt(slot, 10)

  const html = await fetchSlotsPage(session, server)
  const { slots } = parseSlots(html)
  const targetSlot = slots.find(s => s.slotNumber === slotNumber && !s.isEmpty)

  if (!targetSlot) {
    return Response.json({ error: 'Dino not found on slot', slotMissing: true }, { status: 404 })
  }

  const result = await sendGift(session, server, slotNumber, recipientApiId)
  if (!result.ok) {
    return Response.json({ error: result.error ?? 'Failed to send gift' }, { status: 502 })
  }

  return Response.json({ ok: true })
}
