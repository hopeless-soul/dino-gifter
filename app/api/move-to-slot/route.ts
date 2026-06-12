// POST /api/move-to-slot
// Moves a dino from inventory to a server slot and returns the slot number it landed on.
// Body: { server, invId, dinoName }
// Requires x-user-session header to authenticate with ageofdino.ru.

import type { NextRequest } from 'next/server'
import { fetchSlotsPage, moveToSlot } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

export async function POST(request: NextRequest) {
  // Auth guard — session cookie forwarded by the client
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  const { server, invId, dinoName } = await request.json() as {
    server: string
    invId: number
    dinoName: string
  }

  // Snapshot occupied slots before the move so we can detect which slot is new afterward
  const htmlBefore = await fetchSlotsPage(session, server)
  const { slots: slotsBefore } = parseSlots(htmlBefore)
  const occupiedBefore = new Set(slotsBefore.filter(s => !s.isEmpty).map(s => s.slotNumber))

  // Trigger the move on the game site
  const moved = await moveToSlot(session, server, invId)
  if (!moved.ok) {
    return Response.json({ error: moved.error ?? 'Failed to move dino to server' }, { status: 502 })
  }

  // Re-fetch slots and locate the dino: prefer a newly occupied slot by name,
  // fall back to any slot with a matching name in case the slot was already taken
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
