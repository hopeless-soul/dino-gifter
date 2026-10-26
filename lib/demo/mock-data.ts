// All demo data in one place: dinos (every growth stage, with and without cooldown), servers,
// which dinos sit on which server slot, and the starter giveaway. Edit here to change the demo.
import type { Giveaway, GiveawayUser, InventoryItem, SlotCard } from '../types'

export const DEMO_USER: GiveawayUser = {
  id: 'demo',
  username: 'demo',
  role: 'Operator',
  apiId: '0000000',
  isPublic: false,
}

// ── Dinos ─────────────────────────────────────────────────────────────────────

type Stage = 'hatchling' | 'juvenile' | 'subadult' | 'adult'

const STAGES: Record<Stage, { label: string; short: string; growth: number; health: number }> = {
  hatchling: { label: 'Hatchling', short: 'Hatch', growth: 0.1, health: 800 },
  juvenile: { label: 'Juvenile', short: 'Juv', growth: 0.2, health: 1500 },
  subadult: { label: 'Subadult', short: 'Sub', growth: 0.6, health: 3200 },
  adult: { label: 'Adult', short: 'Adult', growth: 1.0, health: 5000 },
}

interface MockDino {
  id: number
  name: string
  stage: Stage
  onCooldown?: boolean
  // No `place` means the dino is in the inventory.
  place?: { server: string; slot: number }
}

export const MOCK_DINOS: MockDino[] = [
  // Inventory: every stage, two on cooldown
  { id: 1001, name: 'Therizinosaurus', stage: 'hatchling' },
  { id: 1002, name: 'Stegosaurus', stage: 'juvenile' },
  { id: 1003, name: 'Triceratops', stage: 'subadult' },
  { id: 1004, name: 'Tyrannosaurus', stage: 'adult' },
  { id: 1005, name: 'Velociraptor', stage: 'adult', onCooldown: true },
  { id: 1006, name: 'Suchomimus', stage: 'juvenile', onCooldown: true },
  // Spread over the servers, two per server, in the first slots
  { id: 2001, name: 'Stegosaurus', stage: 'adult', place: { server: '1', slot: 1 } },
  { id: 2002, name: 'Triceratops', stage: 'juvenile', place: { server: '1', slot: 2 } },
  { id: 2003, name: 'Therizinosaurus', stage: 'subadult', place: { server: '2', slot: 1 } },
  { id: 2004, name: 'Velociraptor', stage: 'hatchling', place: { server: '2', slot: 2 } },
  { id: 2005, name: 'Suchomimus', stage: 'adult', place: { server: '3', slot: 1 } },
  { id: 2006, name: 'Tyrannosaurus', stage: 'subadult', place: { server: '3', slot: 2 } },
]

const growthLabel = (d: MockDino) => `${STAGES[d.stage].label} ${STAGES[d.stage].growth.toFixed(1)}`

// ── Servers ───────────────────────────────────────────────────────────────────

export const MOCK_SERVERS = [
  { id: '1', slotCount: 8 },
  { id: '2', slotCount: 8 },
  { id: '3', slotCount: 8 },
]

// ── Shapes the app consumes ───────────────────────────────────────────────────

export function mockInventory(): InventoryItem[] {
  return MOCK_DINOS.filter(d => !d.place).map(d => ({
    id: d.id,
    name: d.name,
    growthLabel: growthLabel(d),
    onCooldown: !!d.onCooldown,
  }))
}

export function mockSlots(server: string): SlotCard[] {
  const count = MOCK_SERVERS.find(s => s.id === server)?.slotCount ?? 0
  return Array.from({ length: count }, (_, i) => {
    const slotNumber = i + 1
    const d = MOCK_DINOS.find(x => x.place?.server === server && x.place.slot === slotNumber)
    if (!d) return { slotNumber, isEmpty: true, characterClass: '', name: '', growthLabel: '', growth: 0, health: 0 }
    const stage = STAGES[d.stage]
    return {
      slotNumber,
      isEmpty: false,
      characterClass: `${d.name.slice(0, 5)}${stage.short}`,
      name: d.name,
      growthLabel: growthLabel(d),
      growth: stage.growth,
      health: stage.health,
    }
  })
}

// Same response shape as GET /api/slots
export function demoSlots(server: string) {
  return { slots: mockSlots(server), inventory: mockInventory() }
}

// ── Giveaways ─────────────────────────────────────────────────────────────────

// One giveaway on the first placed dino (server 1, slot 1), active now, with a single typing trial.
export function mockGiveaways(): Giveaway[] {
  const d = MOCK_DINOS[6]
  const { server, slot } = d.place!
  return [
    {
      id: 'demo-giveaway',
      dino: { id: String(d.id), name: d.name, growthLabel: growthLabel(d), server, slot: String(slot) },
      activeAt: null,
      trials: [{ type: 'typing', data: { phrase: 'Dinos are the best gift' } }],
      completionStatus: 'not_processed',
      isCanceled: false,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      creator: DEMO_USER,
      recipient: null,
      server,
      slot: String(slot),
    },
  ]
}
