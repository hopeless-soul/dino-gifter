import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moveAndGift } from '../redeem'
import * as ageofdino from '../ageofdino'
import * as slotParser from '../parse-slots'
import type { SlotCard } from '../types'

const SLOT: SlotCard = {
  slotNumber: 1,
  isEmpty: false,
  name: 'Теризинозавр',
  characterClass: 'TheriJuv',
  growthLabel: 'джув 0.2',
  growth: 0.2,
  health: 1000,
}

beforeEach(() => { vi.restoreAllMocks() })

describe('moveAndGift', () => {
  it('moves to server 1 and sends gift when slot available', async () => {
    vi.spyOn(ageofdino, 'moveToSlot').mockResolvedValue({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots').mockReturnValue({ slots: [SLOT], inventory: [] })
    vi.spyOn(ageofdino, 'sendGift').mockResolvedValue({ ok: true })

    const result = await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    expect(ageofdino.moveToSlot).toHaveBeenCalledWith('sess', '1', 337)
    expect(ageofdino.sendGift).toHaveBeenCalledWith('sess', '1', 1, '24556')
    expect(result).toEqual({ ok: true })
  })

  it('skips to server 2 when server 1 is full', async () => {
    vi.spyOn(ageofdino, 'moveToSlot')
      .mockResolvedValueOnce({ ok: false, error: 'пустой слот не найден' })
      .mockResolvedValueOnce({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots').mockReturnValue({ slots: [SLOT], inventory: [] })
    vi.spyOn(ageofdino, 'sendGift').mockResolvedValue({ ok: true })

    await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    expect(ageofdino.moveToSlot).toHaveBeenNthCalledWith(1, 'sess', '1', 337)
    expect(ageofdino.moveToSlot).toHaveBeenNthCalledWith(2, 'sess', '2', 337)
    expect(ageofdino.sendGift).toHaveBeenCalledWith('sess', '2', 1, '24556')
  })

  it('returns error when all three servers are full', async () => {
    vi.spyOn(ageofdino, 'moveToSlot').mockResolvedValue({
      ok: false,
      error: 'пустой слот не найден',
    })

    const result = await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    expect(result).toEqual({ ok: false, error: 'No empty slot available on any server' })
    expect(ageofdino.moveToSlot).toHaveBeenCalledTimes(3)
  })

  it('returns error when dino cannot be found in slots after move', async () => {
    vi.spyOn(ageofdino, 'moveToSlot').mockResolvedValue({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots').mockReturnValue({ slots: [], inventory: [] })

    const result = await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    expect(result).toEqual({ ok: false, error: 'Could not locate dino after move' })
  })
})
