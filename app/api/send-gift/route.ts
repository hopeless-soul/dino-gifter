// POST /api/send-gift
// Sends a dino as a gift to the specified recipient and confirms delivery by
// verifying the dino left its slot, even if the game returns an error response.
// Body: { server, slot, recipientApiId }
// Requires x-user-session header to authenticate with ageofdino.ru.

import type { NextRequest } from 'next/server'
import { fetchSlotsPage, sendGift } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

export async function POST(request: NextRequest) {
  // Auth guard — session cookie forwarded by the client
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  try {
    const { server, slot, recipientApiId } = await request.json() as {
      server: string | null
      slot: string | null
      recipientApiId: string
    }

    // Slot must be resolved before gifting; client should run move-to-slot first
    if (!server || !slot) {
      return Response.json({ error: 'Dino has no server/slot assigned', slotMissing: true }, { status: 404 })
    }

    const slotNumber = parseInt(slot, 10)

    // Verify the dino is actually present on the slot before attempting the gift
    const htmlBefore = await fetchSlotsPage(session, server)
    const { slots: slotsBefore } = parseSlots(htmlBefore)
    if (!slotsBefore.find(s => s.slotNumber === slotNumber && !s.isEmpty)) {
      return Response.json({ error: 'Dino not found on slot', slotMissing: true }, { status: 404 })
    }

    // Attempt the gift; catch throws separately so we can verify the slot afterward
    let sendOk = false
    let sendError: string | undefined
    try {
      const result = await sendGift(session, server, slotNumber, recipientApiId)
      sendOk = result.ok
      sendError = result.error
    } catch {
      // Network error or timeout — game may have processed the gift before the connection dropped
    }

    if (!sendOk) {
      // Re-check the slot: if the dino is gone, the gift went through despite the error response
      const htmlAfter = await fetchSlotsPage(session, server)
      const { slots: slotsAfter } = parseSlots(htmlAfter)
      const slotAfter = slotsAfter.find(s => s.slotNumber === slotNumber)
      const dinoGone = !slotAfter || slotAfter.isEmpty

      if (!dinoGone) {
        return Response.json({ error: sendError ?? 'Failed to send gift' }, { status: 502 })
      }
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
