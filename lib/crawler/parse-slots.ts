// Parses the raw HTML from slots.php into typed SlotCard and InventoryItem arrays.
// All game data is embedded in HTML attributes and text nodes — no JSON API available.
import * as cheerio from 'cheerio'
import type { InventoryItem, SlotCard } from '../types'

export function parseSlots(html: string): { slots: SlotCard[]; inventory: InventoryItem[] } {
  const $ = cheerio.load(html)

  // --- Inventory modal (#inv_modal) ---
  // Each .inv_slot element carries the dino's id and name as data-attributes.
  // Cooldown state is inferred from the inline color style of the .inv_chill element.
  const inventory: InventoryItem[] = []
  $('#inv_modal .inv_slot').each((_, el) => {
    const id = parseInt($(el).attr('data-inv') ?? '0', 10)
    const name = ($(el).attr('data-name') ?? '').trim()
    const growthLabel = $(el).find('.inv_grow').text().trim()
    const chillStyle = $(el).find('.inv_chill').attr('style') ?? ''
    inventory.push({ id, name, growthLabel, onCooldown: /color:\s*red/i.test(chillStyle) })
  })

  // --- Slot grid (.slots_grid) ---
  // Each .card represents one server slot. Slot number is extracted from .slotNumber text.
  // Empty slots contain a .nodino element; occupied slots carry stats in hidden <p> tags.
  const slots: SlotCard[] = []
  $('.slots_grid .card').each((_, el) => {
    const slotText = $(el).find('.slotNumber').text()
    const match = slotText.match(/\d+/)
    if (!match) return
    const slotNumber = parseInt(match[0], 10)
    const isEmpty = $(el).find('.nodino').length > 0

    if (isEmpty) {
      slots.push({ slotNumber, isEmpty: true, characterClass: '', name: '', growthLabel: '', growth: 0, health: 0 })
      return
    }

    // Dino stats are stored as data-value on hidden <p> elements keyed by the data attribute
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
