import { fetchSlotsPage, moveToSlot, sendGift } from './ageofdino'
import { parseSlots } from './parse-slots'

export async function moveAndGift(
  session: string,
  invId: number,
  dinoName: string,
  friendId: string
): Promise<{ ok: boolean; error?: string }> {
  for (const server of ['1', '2', '3']) {
    const moved = await moveToSlot(session, server, invId)
    if (!moved.ok) continue

    const html = await fetchSlotsPage(session, server)
    const { slots } = parseSlots(html)
    const slot = slots.find(s => !s.isEmpty && s.name === dinoName)
    if (!slot) return { ok: false, error: 'Could not locate dino after move' }

    return sendGift(session, server, slot.slotNumber, friendId)
  }
  return { ok: false, error: 'No empty slot available on any server' }
}
