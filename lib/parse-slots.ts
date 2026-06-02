import * as cheerio from 'cheerio'
import type { InventoryItem, SlotCard } from './types'

export function parseSlots(html: string): { slots: SlotCard[]; inventory: InventoryItem[] } {
  const $ = cheerio.load(html)

  const inventory: InventoryItem[] = []
  $('#inv_modal .inv_slot').each((_, el) => {
    const id = parseInt($(el).attr('data-inv') ?? '0', 10)
    const name = ($(el).attr('data-name') ?? '').trim()
    const growthLabel = $(el).find('.inv_grow').text().trim()
    const chillStyle = $(el).find('.inv_chill').attr('style') ?? ''
    inventory.push({ id, name, growthLabel, onCooldown: chillStyle.includes('color: red') })
  })

  const slots: SlotCard[] = []
  $('[id^="card"]').each((_, el) => {
    const slotText = $(el).find('.slotNumber').text()
    const match = slotText.match(/\d+/)
    if (!match) return
    const slotNumber = parseInt(match[0], 10)
    const isEmpty = $(el).find('.nodino').length > 0

    if (isEmpty) {
      slots.push({ slotNumber, isEmpty: true, characterClass: '', name: '', growthLabel: '', growth: 0, health: 0 })
      return
    }

    slots.push({
      slotNumber,
      isEmpty: false,
      name: $(el).find('.dinoname').text().trim(),
      growthLabel: $(el).find('.dinogrowth').text().trim(),
      characterClass: $(el).find('p[data="CharacterClass"]').attr('data-value') ?? '',
      growth: parseFloat($(el).find('p[data="Growth"]').attr('data-value') ?? '0'),
      health: parseInt($(el).find('p[data="Health"]').attr('data-value') ?? '0', 10),
    })
  })

  return { slots, inventory }
}
