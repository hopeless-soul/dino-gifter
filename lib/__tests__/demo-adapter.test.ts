// lib/__tests__/demo-adapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import { demoAdapter } from '../demo/adapter'
import { clearDemoStore } from '../demo/store'
import { mockGiveaways, mockSlots } from '../demo/mock-data'
import type { Giveaway } from '../types'

const demo = axios.create({ adapter: demoAdapter })
const create = (server: string) =>
  demo.post<{ id: string }>('/giveaway', { dino: { id: '1', name: 'Rex', growthLabel: 'Adult' }, server, slot: '1' })

beforeEach(() => {
  clearDemoStore()
})

describe('demo adapter', () => {
  it('gives each active giveaway on a server its own empty slot', async () => {
    await create('1')
    await create('1')
    const { data } = await demo.get<Giveaway[]>('/giveaway')
    const slots = data.map(g => g.slot!)
    expect(new Set(slots).size).toBe(2)
    const empty = mockSlots('1').filter(s => s.isEmpty).map(s => String(s.slotNumber))
    slots.forEach(s => expect(empty).toContain(s))
  })

  it('frees the slot when a giveaway is canceled', async () => {
    const { data: first } = await create('1')
    const before = (await demo.get<Giveaway[]>('/giveaway')).data[0].slot
    await demo.patch(`/giveaway/${first.id}`, { isCanceled: true })
    await create('1')
    const { data } = await demo.get<Giveaway[]>('/giveaway')
    expect(data.filter(g => !g.isCanceled).map(g => g.slot)).toEqual([before])
  })

  it('has a starter giveaway on an occupied slot of the same dino', () => {
    const [g] = mockGiveaways()
    const slot = mockSlots(g.server!).find(s => String(s.slotNumber) === g.slot)
    expect(slot?.isEmpty).toBe(false)
    expect(slot?.name).toBe(g.dino.name)
  })

  it('rejects unknown routes with a 404', async () => {
    await expect(demo.post('/giveaway/abc')).rejects.toMatchObject({ response: { status: 404 } })
  })
})
