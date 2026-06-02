import { fetchSlotsPage, moveToSlot, sendGift } from './ageofdino'
import { parseSlots } from './parse-slots'

export async function moveAndGift(
  session: string,
  invId: number,
  dinoName: string,
  friendId: string
): Promise<{ ok: boolean; error?: string }> {
  for (const server of ['1', '2', '3']) {
    // Snapshot occupied slot numbers before moving
    const htmlBefore = await fetchSlotsPage(session, server)
    const { slots: slotsBefore } = parseSlots(htmlBefore)
    const occupiedBefore = new Set(
      slotsBefore.filter(s => !s.isEmpty).map(s => s.slotNumber)
    )

    const moved = await moveToSlot(session, server, invId)
    if (!moved.ok) continue

    // Re-fetch to find the newly-occupied slot
    const htmlAfter = await fetchSlotsPage(session, server)
    const { slots: slotsAfter } = parseSlots(htmlAfter)

    // Prefer a slot that wasn't occupied before (new slot) AND matches the name
    const slot =
      slotsAfter.find(
        s => !s.isEmpty && !occupiedBefore.has(s.slotNumber) && s.name === dinoName
      ) ?? slotsAfter.find(s => !s.isEmpty && s.name === dinoName)

    if (!slot) return { ok: false, error: 'Could not locate dino after move' }

    return sendGift(session, server, slot.slotNumber, friendId)
  }
  return { ok: false, error: 'No empty slot available on any server' }
}
