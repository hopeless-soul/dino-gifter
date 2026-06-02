import { describe, it, expect } from 'vitest'
import { parseSlots } from '../parse-slots'

const HTML = `
<html><body>
<div id="inv_modal" style="display:block">
  <div class="row"><div class="inv_slots">
    <div data-inv="337" data-name="Теризинозавр" class="inv_slot">
      <span class="inv_name">Теризинозавр&nbsp;<span class="inv_grow">джув 0.2</span></span>
      <div><span class="inv_chill" style="color: red;">100% </span></div>
    </div>
    <div data-inv="345" data-name="Стегозавр" class="inv_slot">
      <span class="inv_name">Стегозавр&nbsp;<span class="inv_grow">адолт 1.0</span></span>
      <div><span class="inv_chill" style="color: green;">100% </span></div>
    </div>
  </div></div>
</div>
<div class="slots_grid">
  <div id="card1" class="card">
    <div><p class="slotNumber">слот: 1</p></div>
    <div>
      <p class="dinoname">Зухомим</p>
      <p class="dinogrowth">адолт 1.0</p>
      <p data="CharacterClass" data-value="SuchoAdultS" class="hidden"></p>
      <p data="Growth" data-value="1.0" class="hidden"></p>
      <p data="Health" data-value="3600" class="hidden"></p>
    </div>
  </div>
  <div id="card2" class="card">
    <div><p class="slotNumber">слот: 2</p></div>
    <div><p class="nodino">в слоте нет дино</p></div>
  </div>
</div>
</body></html>
`

describe('parseSlots – inventory', () => {
  it('returns all inventory items', () => {
    expect(parseSlots(HTML).inventory).toHaveLength(2)
  })
  it('parses id from data-inv', () => {
    expect(parseSlots(HTML).inventory[0].id).toBe(337)
  })
  it('parses name from data-name', () => {
    expect(parseSlots(HTML).inventory[0].name).toBe('Теризинозавр')
  })
  it('parses growthLabel from .inv_grow', () => {
    expect(parseSlots(HTML).inventory[0].growthLabel).toBe('джув 0.2')
  })
  it('sets onCooldown true when inv_chill has color:red', () => {
    const { inventory } = parseSlots(HTML)
    expect(inventory[0].onCooldown).toBe(true)
    expect(inventory[1].onCooldown).toBe(false)
  })
})

describe('parseSlots – slots', () => {
  it('returns all slot cards', () => {
    expect(parseSlots(HTML).slots).toHaveLength(2)
  })
  it('parses slot number', () => {
    expect(parseSlots(HTML).slots[0].slotNumber).toBe(1)
  })
  it('marks occupied slot as not empty', () => {
    expect(parseSlots(HTML).slots[0].isEmpty).toBe(false)
  })
  it('parses dino name from .dinoname', () => {
    expect(parseSlots(HTML).slots[0].name).toBe('Зухомим')
  })
  it('parses growthLabel from .dinogrowth', () => {
    expect(parseSlots(HTML).slots[0].growthLabel).toBe('адолт 1.0')
  })
  it('parses characterClass from hidden p[data]', () => {
    expect(parseSlots(HTML).slots[0].characterClass).toBe('SuchoAdultS')
  })
  it('parses growth as float', () => {
    expect(parseSlots(HTML).slots[0].growth).toBe(1.0)
  })
  it('parses health as integer', () => {
    expect(parseSlots(HTML).slots[0].health).toBe(3600)
  })
  it('marks empty slot with isEmpty:true', () => {
    const slot2 = parseSlots(HTML).slots[1]
    expect(slot2.isEmpty).toBe(true)
    expect(slot2.slotNumber).toBe(2)
  })
})
