// lib/__tests__/redeem.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moveAndGift } from '../redeem'
import * as ageofdino from '../ageofdino'
import * as slotParser from '../parse-slots'
import type { SlotCard } from '../types'

const EMPTY_SLOT: SlotCard = {
  slotNumber: 1,
  isEmpty: true,
  name: '',
  characterClass: '',
  growthLabel: '',
  growth: 0,
  health: 0,
}

const OCCUPIED_SLOT: SlotCard = {
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
  it('snapshots slots before move and finds newly-occupied slot after', async () => {
    vi.spyOn(ageofdino, 'moveToSlot').mockResolvedValue({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage')
      .mockResolvedValueOnce('<html/>')  // before snapshot
      .mockResolvedValueOnce('<html/>')  // after move
    vi.spyOn(slotParser, 'parseSlots')
      .mockReturnValueOnce({ slots: [EMPTY_SLOT], inventory: [] })  // before: slot is empty
      .mockReturnValueOnce({ slots: [OCCUPIED_SLOT], inventory: [] })  // after: slot now occupied
    vi.spyOn(ageofdino, 'sendGift').mockResolvedValue({ ok: true })

    const result = await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    expect(ageofdino.moveToSlot).toHaveBeenCalledWith('sess', '1', 337)
    expect(ageofdino.sendGift).toHaveBeenCalledWith('sess', '1', 1, '24556')
    expect(result).toEqual({ ok: true })
  })

  it('prefers newly-occupied slot over pre-existing same-name slot', async () => {
    const preExistingSlot: SlotCard = {
      slotNumber: 2,
      isEmpty: false,
      name: 'Теризинозавр',
      characterClass: 'TheriAdult',
      growthLabel: 'адолт 1.0',
      growth: 1.0,
      health: 2000,
    }
    const newSlot: SlotCard = {
      slotNumber: 3,
      isEmpty: false,
      name: 'Теризинозавр',
      characterClass: 'TheriJuv',
      growthLabel: 'джув 0.2',
      growth: 0.2,
      health: 1000,
    }

    vi.spyOn(ageofdino, 'moveToSlot').mockResolvedValue({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots')
      .mockReturnValueOnce({ slots: [preExistingSlot], inventory: [] })  // before: slot 2 occupied
      .mockReturnValueOnce({ slots: [preExistingSlot, newSlot], inventory: [] })  // after: slot 3 also occupied
    vi.spyOn(ageofdino, 'sendGift').mockResolvedValue({ ok: true })

    await moveAndGift('sess', 337, 'Теризинозавр', '24556')

    // Should gift from slot 3 (newly occupied), not slot 2 (pre-existing)
    expect(ageofdino.sendGift).toHaveBeenCalledWith('sess', '1', 3, '24556')
  })

  it('skips to server 2 when server 1 is full', async () => {
    vi.spyOn(ageofdino, 'moveToSlot')
      .mockResolvedValueOnce({ ok: false, error: 'пустой слот не найден' })
      .mockResolvedValueOnce({ ok: true })
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots')
      .mockReturnValueOnce({ slots: [], inventory: [] })       // server 1 before snapshot
      .mockReturnValueOnce({ slots: [OCCUPIED_SLOT], inventory: [] })  // server 2 before snapshot
      .mockReturnValueOnce({ slots: [OCCUPIED_SLOT], inventory: [] })  // server 2 after move
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
    vi.spyOn(ageofdino, 'fetchSlotsPage').mockResolvedValue('<html/>')
    vi.spyOn(slotParser, 'parseSlots').mockReturnValue({ slots: [], inventory: [] })

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
