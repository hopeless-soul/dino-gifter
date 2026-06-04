import type { NextRequest } from 'next/server'
import { fetchSlotsPage, moveToSlot } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

export async function POST(request: NextRequest) {
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  const { server, invId, dinoName } = await request.json() as {
    server: string
    invId: number
    dinoName: string
  }

  const htmlBefore = await fetchSlotsPage(session, server)
  const { slots: slotsBefore } = parseSlots(htmlBefore)
  const occupiedBefore = new Set(slotsBefore.filter(s => !s.isEmpty).map(s => s.slotNumber))

  const moved = await moveToSlot(session, server, invId)
  if (!moved.ok) {
    return Response.json({ error: moved.error ?? 'Failed to move dino to server' }, { status: 502 })
  }

  const htmlAfter = await fetchSlotsPage(session, server)
  const { slots: slotsAfter } = parseSlots(htmlAfter)

  const slot =
    slotsAfter.find(s => !s.isEmpty && !occupiedBefore.has(s.slotNumber) && s.name === dinoName) ??
    slotsAfter.find(s => !s.isEmpty && s.name === dinoName)

  if (!slot) {
    return Response.json({ error: 'Could not locate dino after move' }, { status: 502 })
  }

  return Response.json({ slotNumber: slot.slotNumber })
}
