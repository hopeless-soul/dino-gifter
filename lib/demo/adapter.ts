// Axios adapter that answers the backend endpoints from the local demo store,
// so no request ever leaves the browser while demo mode is on.
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import type { Giveaway } from '../types'
import { DEMO_USER, mockSlots } from './mock-data'
import { loadGiveaways, saveGiveaways } from './store'

type Body = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

// Returns [status, data], or undefined for an unknown route.
function route(method: string, url: string, body: Body): [number, unknown] | undefined {
  const list = loadGiveaways()
  const id = /^\/giveaway\/([^/]+)$/.exec(url)?.[1]

  if (url === '/giveaway' && method === 'get') return [200, [...list].reverse()]

  if (url === '/giveaway' && method === 'post') {
    const server = String(body.server)
    // The stateless /api/move-to-slot fixture can't know which slot is free, so pick one here:
    // empty in the mock server and not taken by a live demo giveaway.
    const used = new Set(list.filter(g => g.server === server && !g.recipient && !g.isCanceled).map(g => g.slot))
    const slot = mockSlots(server).find(s => s.isEmpty && !used.has(String(s.slotNumber)))?.slotNumber
    if (!slot) return [409, { message: 'No free slot on this server' }]
    const giveaway: Giveaway = {
      id: crypto.randomUUID(),
      dino: { ...body.dino, server, slot: String(slot) },
      activeAt: body.activeAt ?? null,
      trials: body.trials ?? null,
      completionStatus: 'not_processed',
      isCanceled: false,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      creator: DEMO_USER,
      recipient: null,
      server,
      slot: String(slot),
    }
    saveGiveaways([...list, giveaway])
    return [201, { id: giveaway.id }]
  }

  if (id && method === 'get') {
    const g = list.find(x => x.id === id)
    return g ? [200, g] : [404, { message: 'Not found' }]
  }

  if (id && method === 'patch') {
    const g = list.find(x => x.id === id)
    if (!g) return [404, { message: 'Not found' }]
    Object.assign(g, body)
    saveGiveaways(list)
    return [200, g]
  }

  if (url === '/users/me' && method === 'get') return [200, DEMO_USER]
  // shortcut: apiId edits are accepted but not kept; persist in the store if the demo needs it.
  if (url === '/users' && method === 'patch') return [200, {}]
  if (url === '/auth/logout' && method === 'post') return [200, {}]
  return undefined
}

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = (config.url ?? '').split('?')[0]
  const body: Body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {})
  const [status, data] = route((config.method ?? 'get').toLowerCase(), url, body) ?? [404, { message: 'Not available in demo' }]
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} }
  if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response)
  return response
}
