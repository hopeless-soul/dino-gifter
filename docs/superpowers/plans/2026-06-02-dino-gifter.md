# Dino Gifter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 App Router tool for browsing ageofdino.ru inventory, configuring time-locked giveaways with optional typing trials, generating shareable redemption links, and triggering the in-game Gift API on redemption.

**Architecture:** Client components hold the UserSession cookie (persisted in localStorage). Route handlers proxy all ageofdino.ru calls server-side using the session cookie; cheerio parses game HTML into typed JSON. A module-level Map in `lib/mock-store.ts` mocks persistence — swap its three exported functions for real DB calls when a backend is added.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, cheerio, nanoid, Vitest + jsdom + @testing-library/react

---

## File Map

**Create:**
```
vitest.config.ts
vitest.setup.ts
lib/types.ts
lib/friends.ts
lib/session.ts
lib/use-session.ts
lib/parse-slots.ts
lib/mock-store.ts
lib/ageofdino.ts
lib/redeem.ts
lib/__tests__/parse-slots.test.ts
lib/__tests__/mock-store.test.ts
lib/__tests__/ageofdino.test.ts
lib/__tests__/redeem.test.ts
app/api/slots/route.ts
app/api/giveaways/route.ts
app/api/giveaways/[id]/route.ts
app/api/giveaways/[id]/redeem/route.ts
components/SessionInput.tsx
components/ServerTabs.tsx
components/SlotsGrid.tsx
components/InventoryPanel.tsx
components/CountdownTimer.tsx
components/TypingTrial.tsx
components/__tests__/CountdownTimer.test.tsx
components/__tests__/TypingTrial.test.tsx
app/giveaway/new/page.tsx
app/giveaway/new/configurator.tsx
app/giveaway/[id]/page.tsx
app/login/page.tsx
app/register/page.tsx
```

**Modify:**
```
package.json        add deps + test scripts
app/page.tsx        replace with Inventory page
app/layout.tsx      update title/description metadata only
```

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install cheerio nanoid
```

Expected: packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json` and replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 5: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Smoke-test the setup**

```bash
npx vitest run
```

Expected: `No test files found` (zero failures — setup is correct).

- [ ] **Step 7: Commit**

```bash
git add package.json vitest.config.ts vitest.setup.ts
git commit -m "chore: add Vitest, cheerio, nanoid"
```

---

## Task 2: Types, constants, and session helpers

**Files:**
- Create: `lib/types.ts`
- Create: `lib/friends.ts`
- Create: `lib/session.ts`
- Create: `lib/use-session.ts`

No tests needed — pure type declarations and thin localStorage wrappers.

- [ ] **Step 1: Create lib/types.ts**

```ts
export interface SlotCard {
  slotNumber: number
  isEmpty: boolean
  characterClass: string
  name: string
  growthLabel: string
  growth: number
  health: number
}

export interface InventoryItem {
  id: number
  name: string
  growthLabel: string
  onCooldown: boolean
}

export interface GiveawayConfig {
  id: string
  invId: number
  dinoName: string
  growthLabel: string
  activeAt: string | null
  trial: TypingTrial | null
  session: string
  recipientFriendId: string
  createdAt: string
  redeemed: boolean
}

export interface TypingTrial {
  type: 'typing'
  phrase: string
}

export interface Friend {
  id: string
  name: string
}

export interface PublicGiveaway {
  id: string
  dinoName: string
  growthLabel: string
  activeAt: string | null
  trial: TypingTrial | null
  redeemed: boolean
}
```

- [ ] **Step 2: Create lib/friends.ts**

```ts
import type { Friend } from './types'

export const FRIENDS: Friend[] = [
  { id: '24556', name: 'PlayerName' },
]
```

- [ ] **Step 3: Create lib/session.ts**

```ts
const KEY = 'dino_user_session'

export function loadSession(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(KEY) ?? ''
}

export function saveSession(value: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, value)
}
```

- [ ] **Step 4: Create lib/use-session.ts**

```ts
'use client'
import { useState, useEffect } from 'react'
import { loadSession, saveSession } from './session'

export function useSession() {
  const [session, setSessionState] = useState('')

  useEffect(() => {
    setSessionState(loadSession())
  }, [])

  function setSession(value: string) {
    saveSession(value)
    setSessionState(value)
  }

  return [session, setSession] as const
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/friends.ts lib/session.ts lib/use-session.ts
git commit -m "feat: add types, friends list, session helpers"
```

---

## Task 3: parseSlots (TDD)

**Files:**
- Create: `lib/__tests__/parse-slots.test.ts`
- Create: `lib/parse-slots.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/parse-slots.test.ts
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
      <div><span class="inv_chill">100% </span></div>
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
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run lib/__tests__/parse-slots.test.ts
```

Expected: `FAIL` — `Cannot find module '../parse-slots'`

- [ ] **Step 3: Implement lib/parse-slots.ts**

```ts
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
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run lib/__tests__/parse-slots.test.ts
```

Expected: `PASS` — 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/parse-slots.ts lib/__tests__/parse-slots.test.ts
git commit -m "feat: add parseSlots with cheerio"
```

---

## Task 4: mock-store (TDD)

**Files:**
- Create: `lib/__tests__/mock-store.test.ts`
- Create: `lib/mock-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/mock-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createGiveaway, getGiveaway, markRedeemed, _resetStore } from '../mock-store'

beforeEach(() => { _resetStore() })

const BASE = {
  invId: 337,
  dinoName: 'Теризинозавр',
  growthLabel: 'джув 0.2',
  activeAt: null,
  trial: null,
  session: 'abc123',
  recipientFriendId: '24556',
}

describe('createGiveaway', () => {
  it('returns a non-empty string id', () => {
    const id = createGiveaway(BASE)
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
  it('each call returns a unique id', () => {
    expect(createGiveaway(BASE)).not.toBe(createGiveaway(BASE))
  })
})

describe('getGiveaway', () => {
  it('retrieves the created giveaway by id', () => {
    const id = createGiveaway(BASE)
    const g = getGiveaway(id)
    expect(g?.dinoName).toBe('Теризинозавр')
    expect(g?.redeemed).toBe(false)
    expect(g?.session).toBe('abc123')
  })
  it('returns undefined for unknown id', () => {
    expect(getGiveaway('nonexistent')).toBeUndefined()
  })
})

describe('markRedeemed', () => {
  it('sets redeemed to true', () => {
    const id = createGiveaway(BASE)
    markRedeemed(id)
    expect(getGiveaway(id)?.redeemed).toBe(true)
  })
  it('is a no-op for unknown id', () => {
    expect(() => markRedeemed('unknown')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run lib/__tests__/mock-store.test.ts
```

Expected: `FAIL` — `Cannot find module '../mock-store'`

- [ ] **Step 3: Implement lib/mock-store.ts**

```ts
import { nanoid } from 'nanoid'
import type { GiveawayConfig } from './types'

const store = new Map<string, GiveawayConfig>()

export function createGiveaway(
  config: Omit<GiveawayConfig, 'id' | 'createdAt' | 'redeemed'>
): string {
  const id = nanoid()
  store.set(id, { ...config, id, createdAt: new Date().toISOString(), redeemed: false })
  return id
}

export function getGiveaway(id: string): GiveawayConfig | undefined {
  return store.get(id)
}

export function markRedeemed(id: string): void {
  const g = store.get(id)
  if (g) store.set(id, { ...g, redeemed: true })
}

/** For tests only — clears all giveaways */
export function _resetStore(): void {
  store.clear()
}
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run lib/__tests__/mock-store.test.ts
```

Expected: `PASS` — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/mock-store.ts lib/__tests__/mock-store.test.ts
git commit -m "feat: add in-memory mock giveaway store"
```

---

## Task 5: ageofdino HTTP client (TDD)

**Files:**
- Create: `lib/__tests__/ageofdino.test.ts`
- Create: `lib/ageofdino.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/ageofdino.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSlotsPage, moveToSlot, sendGift } from '../ageofdino'

const SESSION = 'test_session_token'

beforeEach(() => { vi.restoreAllMocks() })

describe('fetchSlotsPage', () => {
  it('POSTs to ajax_server.php then GETs slots.php', async () => {
    const html = '<html>slots</html>'
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(''))
      .mockResolvedValueOnce(new Response(html))
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchSlotsPage(SESSION, '2')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('https://ageofdino.ru/ajax_server.php')
    expect(mockFetch.mock.calls[0][1].body).toBe('server=2')
    expect(mockFetch.mock.calls[1][0]).toBe('https://ageofdino.ru/slots.php')
    expect(result).toBe(html)
  })

  it('sends the UserSession cookie', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await fetchSlotsPage(SESSION, '1')

    expect(mockFetch.mock.calls[0][1].headers.Cookie).toBe(`UserSession=${SESSION}`)
  })
})

describe('moveToSlot', () => {
  it('returns ok:true when response body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')))
    expect(await moveToSlot(SESSION, '1', 337)).toEqual({ ok: true })
  })

  it('returns ok:false with Russian error text when slot not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('пустой слот не найден')))
    expect(await moveToSlot(SESSION, '1', 337)).toEqual({
      ok: false,
      error: 'пустой слот не найден',
    })
  })

  it('POSTs to ajax_inv_to_slot.php with server and num', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await moveToSlot(SESSION, '2', 337)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ageofdino.ru/ajax_inv_to_slot.php',
      expect.objectContaining({ method: 'POST', body: 'server=2&num=337' })
    )
  })
})

describe('sendGift', () => {
  it('POSTs Gift mode to ajax_changedino.php', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await sendGift(SESSION, '2', 3, '24556')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ageofdino.ru/ajax_changedino.php',
      expect.objectContaining({
        method: 'POST',
        body: 'server=2&mode=Gift&num=3&FriendID=24556',
      })
    )
  })

  it('returns ok:true on 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')))
    expect(await sendGift(SESSION, '2', 3, '24556')).toEqual({ ok: true })
  })

  it('returns ok:false on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    expect(await sendGift(SESSION, '2', 3, '24556')).toEqual({ ok: false, error: 'HTTP 500' })
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run lib/__tests__/ageofdino.test.ts
```

Expected: `FAIL` — `Cannot find module '../ageofdino'`

- [ ] **Step 3: Implement lib/ageofdino.ts**

```ts
const BASE = 'https://ageofdino.ru'

function gameHeaders(session: string): Record<string, string> {
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: `UserSession=${session}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Origin: BASE,
    Referer: `${BASE}/slots.php`,
  }
}

export async function fetchSlotsPage(session: string, server: string): Promise<string> {
  await fetch(`${BASE}/ajax_server.php`, {
    method: 'POST',
    headers: gameHeaders(session),
    body: `server=${server}`,
  })
  const res = await fetch(`${BASE}/slots.php`, {
    headers: {
      Cookie: `UserSession=${session}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })
  return res.text()
}

export async function moveToSlot(
  session: string,
  server: string,
  invId: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/ajax_inv_to_slot.php`, {
    method: 'POST',
    headers: gameHeaders(session),
    body: `server=${server}&num=${invId}`,
  })
  const body = (await res.text()).trim()
  return body.length > 0 ? { ok: false, error: body } : { ok: true }
}

export async function sendGift(
  session: string,
  server: string,
  slotNum: number,
  friendId: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/ajax_changedino.php`, {
    method: 'POST',
    headers: gameHeaders(session),
    body: `server=${server}&mode=Gift&num=${slotNum}&FriendID=${friendId}`,
  })
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return { ok: true }
}
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run lib/__tests__/ageofdino.test.ts
```

Expected: `PASS` — 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ageofdino.ts lib/__tests__/ageofdino.test.ts
git commit -m "feat: add ageofdino HTTP client"
```

---

## Task 6: Redeem orchestration (TDD)

**Files:**
- Create: `lib/__tests__/redeem.test.ts`
- Create: `lib/redeem.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/redeem.test.ts
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
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run lib/__tests__/redeem.test.ts
```

Expected: `FAIL` — `Cannot find module '../redeem'`

- [ ] **Step 3: Implement lib/redeem.ts**

```ts
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
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run lib/__tests__/redeem.test.ts
```

Expected: `PASS` — 4 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/redeem.ts lib/__tests__/redeem.test.ts
git commit -m "feat: add redeem orchestration (move + gift)"
```

---

## Task 7: API route — GET /api/slots

**Files:**
- Create: `app/api/slots/route.ts`

- [ ] **Step 1: Create app/api/slots/route.ts**

```ts
import type { NextRequest } from 'next/server'
import { fetchSlotsPage } from '@/lib/ageofdino'
import { parseSlots } from '@/lib/parse-slots'

export async function GET(request: NextRequest) {
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  const server = request.nextUrl.searchParams.get('server') ?? '1'

  try {
    const html = await fetchSlotsPage(session, server)
    return Response.json(parseSlots(html))
  } catch {
    return Response.json({ error: 'Failed to fetch from ageofdino.ru' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server:
```bash
npx next dev
```

In a second terminal, test with a real session cookie (replace `YOUR_SESSION`):
```bash
curl -s "http://localhost:3000/api/slots?server=1" -H "x-user-session: YOUR_SESSION" | head -c 500
```

Expected: JSON with `slots` and `inventory` arrays.

Test missing session:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/slots?server=1"
```

Expected: `401`

- [ ] **Step 4: Commit**

```bash
git add app/api/slots/route.ts
git commit -m "feat: add GET /api/slots route handler"
```

---

## Task 8: API routes — POST + GET /api/giveaways

**Files:**
- Create: `app/api/giveaways/route.ts`
- Create: `app/api/giveaways/[id]/route.ts`

- [ ] **Step 1: Create app/api/giveaways/route.ts**

```ts
import type { NextRequest } from 'next/server'
import { createGiveaway } from '@/lib/mock-store'
import { FRIENDS } from '@/lib/friends'
import type { TypingTrial } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    session?: string
    invId?: number
    dinoName?: string
    growthLabel?: string
    activeAt?: string | null
    trial?: TypingTrial | null
  }

  if (!body.session || !body.dinoName || body.invId == null) {
    return Response.json({ error: 'Missing required fields: session, invId, dinoName' }, { status: 400 })
  }

  const id = createGiveaway({
    session: body.session,
    invId: body.invId,
    dinoName: body.dinoName,
    growthLabel: body.growthLabel ?? '',
    activeAt: body.activeAt ?? null,
    trial: body.trial ?? null,
    recipientFriendId: FRIENDS[0].id,
  })

  return Response.json({ id }, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/giveaways/[id]/route.ts**

```ts
import type { NextRequest } from 'next/server'
import { getGiveaway } from '@/lib/mock-store'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const g = getGiveaway(id)
  if (!g) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    id: g.id,
    dinoName: g.dinoName,
    growthLabel: g.growthLabel,
    activeAt: g.activeAt,
    trial: g.trial,
    redeemed: g.redeemed,
  })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test — create and retrieve a giveaway**

With dev server running:
```bash
curl -s -X POST http://localhost:3000/api/giveaways \
  -H "Content-Type: application/json" \
  -d '{"session":"test","invId":337,"dinoName":"Теризинозавр","growthLabel":"джув 0.2","activeAt":null,"trial":null}'
```

Expected: `{"id":"<some-nanoid>"}` with status 201.

Copy the returned id and fetch it:
```bash
curl -s http://localhost:3000/api/giveaways/<id>
```

Expected: `{"id":"...","dinoName":"Теризинозавр","growthLabel":"джув 0.2","activeAt":null,"trial":null,"redeemed":false}`

Test 404:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/giveaways/doesnotexist
```

Expected: `404`

- [ ] **Step 5: Commit**

```bash
git add app/api/giveaways/route.ts "app/api/giveaways/[id]/route.ts"
git commit -m "feat: add POST/GET /api/giveaways routes"
```

---

## Task 9: API route — POST /api/giveaways/[id]/redeem

**Files:**
- Create: `app/api/giveaways/[id]/redeem/route.ts`

- [ ] **Step 1: Create app/api/giveaways/[id]/redeem/route.ts**

```ts
import type { NextRequest } from 'next/server'
import { getGiveaway, markRedeemed } from '@/lib/mock-store'
import { moveAndGift } from '@/lib/redeem'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const g = getGiveaway(id)

  if (!g) return Response.json({ error: 'Not found' }, { status: 404 })
  if (g.redeemed) return Response.json({ error: 'Already redeemed' }, { status: 409 })
  if (g.activeAt && new Date(g.activeAt) > new Date()) {
    return Response.json({ error: 'Giveaway is not yet active' }, { status: 403 })
  }

  const result = await moveAndGift(g.session, g.invId, g.dinoName, g.recipientFriendId)
  if (!result.ok) return Response.json({ error: result.error }, { status: 502 })

  markRedeemed(id)
  return Response.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test — full create + redeem cycle**

With dev server running, first create:
```bash
curl -s -X POST http://localhost:3000/api/giveaways \
  -H "Content-Type: application/json" \
  -d '{"session":"REAL_SESSION","invId":337,"dinoName":"Теризинозавр","growthLabel":"джув 0.2","activeAt":null,"trial":null}'
```

Copy the id, then redeem:
```bash
curl -s -X POST http://localhost:3000/api/giveaways/<id>/redeem
```

Expected: `{"ok":true}` (or a game error message if session/dino state is invalid).

Test double-redeem:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/giveaways/<id>/redeem
```

Expected: `409`

- [ ] **Step 4: Commit**

```bash
git add "app/api/giveaways/[id]/redeem/route.ts"
git commit -m "feat: add POST /api/giveaways/[id]/redeem route"
```

---

## Task 10: SessionInput component

**Files:**
- Create: `components/SessionInput.tsx`

- [ ] **Step 1: Create components/SessionInput.tsx**

```tsx
'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  onConnect: () => void
  loading?: boolean
  error?: string | null
}

export function SessionInput({ value, onChange, onConnect, loading, error }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white border-b border-gray-200">
      <div className="flex gap-2 max-w-2xl">
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value.trim() && onConnect()}
          placeholder="Paste your UserSession cookie…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onConnect}
          disabled={!value.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap text-sm font-medium"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/SessionInput.tsx
git commit -m "feat: add SessionInput component"
```

---

## Task 11: ServerTabs + SlotsGrid components

**Files:**
- Create: `components/ServerTabs.tsx`
- Create: `components/SlotsGrid.tsx`

- [ ] **Step 1: Create components/ServerTabs.tsx**

```tsx
'use client'

const SERVERS = [
  { id: '1', label: 'Survival 1' },
  { id: '2', label: 'Survival 2' },
  { id: '3', label: 'Chill' },
]

interface Props {
  active: string
  onChange: (server: string) => void
}

export function ServerTabs({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200">
      {SERVERS.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            active === s.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create components/SlotsGrid.tsx**

```tsx
import type { SlotCard } from '@/lib/types'

interface Props {
  slots: SlotCard[]
}

export function SlotsGrid({ slots }: Props) {
  if (slots.length === 0) {
    return <p className="text-gray-400 text-sm py-6 px-4 text-center">No slots found.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
      {slots.map(slot => (
        <div
          key={slot.slotNumber}
          className={`border rounded-lg p-3 text-sm ${
            slot.isEmpty
              ? 'border-dashed border-gray-300 text-gray-400 bg-gray-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <p className="text-xs text-gray-400 mb-1">Slot {slot.slotNumber}</p>
          {slot.isEmpty ? (
            <p className="italic text-xs">Empty</p>
          ) : (
            <>
              <p className="font-medium truncate">{slot.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{slot.growthLabel}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ServerTabs.tsx components/SlotsGrid.tsx
git commit -m "feat: add ServerTabs and SlotsGrid components"
```

---

## Task 12: InventoryPanel component

**Files:**
- Create: `components/InventoryPanel.tsx`

- [ ] **Step 1: Create components/InventoryPanel.tsx**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import type { InventoryItem } from '@/lib/types'

interface Props {
  items: InventoryItem[]
}

export function InventoryPanel({ items }: Props) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-6 px-4 text-center">Inventory is empty.</p>
    )
  }

  function giftItem(item: InventoryItem) {
    router.push(
      `/giveaway/new?invId=${item.id}&name=${encodeURIComponent(item.name)}&growth=${encodeURIComponent(item.growthLabel)}`
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 max-h-72 overflow-y-auto">
      {items.map(item => (
        <div
          key={item.id}
          className="relative group border border-gray-200 rounded-lg p-3 text-sm bg-white hover:border-blue-300 transition-colors cursor-pointer"
        >
          <p className="font-medium truncate leading-snug">{item.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{item.growthLabel}</p>
          {item.onCooldown && (
            <span className="text-xs text-red-500 block mt-0.5">Cooldown</span>
          )}
          <button
            onClick={() => giftItem(item)}
            className="absolute inset-0 w-full h-full rounded-lg bg-blue-600/90 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            Gift
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/InventoryPanel.tsx
git commit -m "feat: add InventoryPanel with hover Gift button"
```

---

## Task 13: CountdownTimer component (TDD)

**Files:**
- Create: `components/__tests__/CountdownTimer.test.tsx`
- Create: `components/CountdownTimer.tsx`

Tests cover the pure `formatCountdown` utility; the React hook logic is covered by the visual smoke test.

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/CountdownTimer.test.tsx
import { describe, it, expect } from 'vitest'
import { formatCountdown } from '../CountdownTimer'

describe('formatCountdown', () => {
  it('formats 3661000ms as 01:01:01', () => {
    expect(formatCountdown(3661000)).toBe('01:01:01')
  })
  it('formats 0ms as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
  })
  it('formats negative ms as 00:00:00', () => {
    expect(formatCountdown(-500)).toBe('00:00:00')
  })
  it('pads single-digit values', () => {
    expect(formatCountdown(3600000 + 60000 + 5000)).toBe('01:01:05')
  })
  it('handles >24 hours correctly', () => {
    expect(formatCountdown(90061000)).toBe('25:01:01')
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run components/__tests__/CountdownTimer.test.tsx
```

Expected: `FAIL` — `Cannot find module '../CountdownTimer'`

- [ ] **Step 3: Implement components/CountdownTimer.tsx**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

interface Props {
  activeAt: string
  onActive?: () => void
}

export function CountdownTimer({ activeAt, onActive }: Props) {
  const target = new Date(activeAt).getTime()
  const [remaining, setRemaining] = useState(() => target - Date.now())

  const handleActive = useCallback(() => onActive?.(), [onActive])

  useEffect(() => {
    if (remaining <= 0) { handleActive(); return }
    const id = setInterval(() => {
      const r = target - Date.now()
      setRemaining(r)
      if (r <= 0) { clearInterval(id); handleActive() }
    }, 1000)
    return () => clearInterval(id)
  }, [target, handleActive])

  if (remaining <= 0) return null

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Available in</p>
      <p className="text-4xl font-mono font-bold tabular-nums text-gray-800">
        {formatCountdown(remaining)}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run components/__tests__/CountdownTimer.test.tsx
```

Expected: `PASS` — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/CountdownTimer.tsx components/__tests__/CountdownTimer.test.tsx
git commit -m "feat: add CountdownTimer component"
```

---

## Task 14: TypingTrial component (TDD)

**Files:**
- Create: `components/__tests__/TypingTrial.test.tsx`
- Create: `components/TypingTrial.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/TypingTrial.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TypingTrial } from '../TypingTrial'

describe('TypingTrial', () => {
  it('calls onSuccess when the correct phrase is submitted', () => {
    const onSuccess = vi.fn()
    render(<TypingTrial phrase="hello world" onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello world' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not call onSuccess when wrong phrase is submitted', () => {
    const onSuccess = vi.fn()
    render(<TypingTrial phrase="hello world" onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong answer' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows error text when wrong phrase is submitted', () => {
    render(<TypingTrial phrase="hello world" onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })

  it('also submits on Enter key', () => {
    const onSuccess = vi.fn()
    render(<TypingTrial phrase="abc" onSuccess={onSuccess} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run — expect failure**

```bash
npx vitest run components/__tests__/TypingTrial.test.tsx
```

Expected: `FAIL` — `Cannot find module '../TypingTrial'`

- [ ] **Step 3: Implement components/TypingTrial.tsx**

```tsx
'use client'
import { useState } from 'react'

interface Props {
  phrase: string
  onSuccess: () => void
}

export function TypingTrial({ phrase, onSuccess }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (input === phrase) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center max-w-sm mx-auto w-full">
      <p className="text-sm text-gray-600">Type the phrase below to unlock</p>
      <input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className={`w-full border rounded px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        placeholder="Type here…"
      />
      {error && (
        <p className="text-red-500 text-sm">Incorrect phrase. Try again.</p>
      )}
      <button
        onClick={submit}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
      >
        Submit
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect all pass**

```bash
npx vitest run components/__tests__/TypingTrial.test.tsx
```

Expected: `PASS` — 4 tests pass.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/TypingTrial.tsx components/__tests__/TypingTrial.test.tsx
git commit -m "feat: add TypingTrial component"
```

---

## Task 15: App layout update + Inventory page

**Files:**
- Modify: `app/layout.tsx` (title/description only)
- Modify: `app/page.tsx` (full replacement)

- [ ] **Step 1: Update metadata in app/layout.tsx**

Replace the `metadata` export only (keep fonts and JSX unchanged):

```ts
export const metadata: Metadata = {
  title: 'Dino Gifter',
  description: 'Manage and gift your Age of Dino dinosaurs',
}
```

- [ ] **Step 2: Replace app/page.tsx with the Inventory page**

```tsx
'use client'
import { useState } from 'react'
import { useSession } from '@/lib/use-session'
import { SessionInput } from '@/components/SessionInput'
import { InventoryPanel } from '@/components/InventoryPanel'
import { ServerTabs } from '@/components/ServerTabs'
import { SlotsGrid } from '@/components/SlotsGrid'
import type { InventoryItem, SlotCard } from '@/lib/types'

export default function InventoryPage() {
  const [session, setSession] = useSession()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [activeServer, setActiveServer] = useState('1')

  async function connect() {
    if (!session.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Sequential fetches: ageofdino.ru uses server-side session context that
      // can race if multiple server-switches hit simultaneously for the same cookie.
      const results: { slots: SlotCard[]; inventory: InventoryItem[] }[] = []
      for (const server of ['1', '2', '3']) {
        const res = await fetch(`/api/slots?server=${server}`, {
          headers: { 'x-user-session': session },
        })
        if (!res.ok) {
          const data = await res.json() as { error: string }
          throw new Error(res.status === 401 ? 'Session invalid or expired' : data.error)
        }
        results.push(await res.json())
      }
      setInventory(results[0].inventory)
      setServerSlots({
        '1': results[0].slots,
        '2': results[1].slots,
        '3': results[2].slots,
      })
      setConnected(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <h1 className="text-base font-bold text-gray-800">🦕 Dino Gifter</h1>
        <nav className="flex gap-4 text-sm text-gray-500 ml-auto">
          <a href="/login" className="hover:text-gray-700">Login</a>
          <a href="/register" className="hover:text-gray-700">Register</a>
        </nav>
      </header>

      <SessionInput
        value={session}
        onChange={setSession}
        onConnect={connect}
        loading={loading}
        error={error}
      />

      {!connected && !loading && (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          Enter your UserSession cookie and click Connect.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          Loading all servers…
        </div>
      )}

      {connected && (
        <main className="max-w-7xl mx-auto p-4 flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Inventory — {inventory.length} items
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <InventoryPanel items={inventory} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Server Slots
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <ServerTabs active={activeServer} onChange={setActiveServer} />
              <SlotsGrid slots={serverSlots[activeServer] ?? []} />
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual smoke test**

Start dev server and visit `http://localhost:3000`. Verify:
- Page loads with session input visible
- Pasting a real session cookie and clicking Connect loads inventory + server slots
- Hovering an inventory item shows "Gift" button overlay
- Clicking "Gift" navigates to `/giveaway/new?invId=...&name=...&growth=...`

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: implement Inventory page"
```

---

## Task 16: Giveaway Configurator page

**Files:**
- Create: `app/giveaway/new/page.tsx` (Suspense wrapper — server component)
- Create: `app/giveaway/new/configurator.tsx` (client component)

`page.tsx` must be a Server Component wrapping the client component in Suspense because `useSearchParams` requires a Suspense boundary in Next.js 15+.

- [ ] **Step 1: Create app/giveaway/new/page.tsx**

```tsx
import { Suspense } from 'react'
import { GiveawayConfigurator } from './configurator'

export default function GiveawayNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      }
    >
      <GiveawayConfigurator />
    </Suspense>
  )
}
```

- [ ] **Step 2: Create app/giveaway/new/configurator.tsx**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import type { InventoryItem, TypingTrial } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState<number | null>(null)
  const [activeAt, setActiveAt] = useState('')
  const [trialEnabled, setTrialEnabled] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    if (!session) return
    const res = await fetch('/api/slots?server=1', {
      headers: { 'x-user-session': session },
    })
    if (res.ok) {
      const data = await res.json() as { inventory: InventoryItem[] }
      setInventory(data.inventory)
    }
  }, [session])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  useEffect(() => {
    const id = params.get('invId')
    if (id) setInvId(parseInt(id, 10))
  }, [params])

  const selectedItem = inventory.find(i => i.id === invId)

  async function submit() {
    if (!session) { setError('No session. Go back and Connect first.'); return }
    if (!invId) { setError('Select a dino.'); return }
    if (trialEnabled && !phrase.trim()) { setError('Enter a trial phrase.'); return }

    setSubmitting(true)
    setError(null)

    const trial: TypingTrial | null = trialEnabled
      ? { type: 'typing', phrase: phrase.trim() }
      : null

    try {
      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          invId,
          dinoName: selectedItem?.name ?? '',
          growthLabel: selectedItem?.growthLabel ?? '',
          activeAt: activeAt ? new Date(activeAt).toISOString() : null,
          trial,
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create giveaway')
      router.push(`/giveaway/${data.id}?created=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4 pb-12">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-800">Configure Giveaway</h1>
        </div>

        {/* Dino picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Dino</label>
          {!session ? (
            <p className="text-sm text-gray-400">No session — go back and connect first.</p>
          ) : inventory.length === 0 ? (
            <p className="text-sm text-gray-400">Loading inventory…</p>
          ) : (
            <select
              value={invId ?? ''}
              onChange={e => setInvId(parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a dino…</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.growthLabel}
                  {item.onCooldown ? ' (cooldown)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Active at */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Active at (optional)</label>
          <input
            type="datetime-local"
            value={activeAt}
            onChange={e => setActiveAt(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">Leave empty to activate immediately.</p>
        </div>

        {/* Trial toggle */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trialEnabled}
              onChange={e => setTrialEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable typing trial</span>
          </label>
          {trialEnabled && (
            <div className="flex flex-col gap-1.5 pl-6">
              <label className="text-sm text-gray-600">
                Phrase the recipient must type exactly
              </label>
              <input
                type="text"
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                placeholder="e.g. I love Theri"
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !invId}
          className="py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {submitting ? 'Generating link…' : 'Generate Link'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual smoke test**

With dev server running:
1. Visit `http://localhost:3000`, connect with a real session.
2. Hover an inventory item and click "Gift".
3. Verify the configurator page opens with the item pre-selected.
4. Set an active time, optionally enable a typing trial.
5. Click "Generate Link" — verify it redirects to `/giveaway/<id>?created=1`.

- [ ] **Step 5: Commit**

```bash
git add "app/giveaway/new/page.tsx" "app/giveaway/new/configurator.tsx"
git commit -m "feat: implement Giveaway Configurator page"
```

---

## Task 17: Giveaway recipient page

**Files:**
- Create: `app/giveaway/[id]/page.tsx`

- [ ] **Step 1: Create app/giveaway/[id]/page.tsx**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CountdownTimer } from '@/components/CountdownTimer'
import { TypingTrial } from '@/components/TypingTrial'
import type { PublicGiveaway } from '@/lib/types'

export default function GiveawayPage() {
  const { id } = useParams<{ id: string }>()

  const [giveaway, setGiveaway] = useState<PublicGiveaway | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [trialPassed, setTrialPassed] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    fetch(`/api/giveaways/${id}`)
      .then(r => r.json())
      .then((data: PublicGiveaway & { error?: string }) => {
        if (data.error) { setFetchError(data.error); return }
        setGiveaway(data)
        setRedeemed(data.redeemed)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) {
          setActive(true)
        }
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    const res = await fetch(`/api/giveaways/${id}/redeem`, { method: 'POST' })
    const data = await res.json() as { ok?: boolean; error?: string }
    if (res.ok) {
      setRedeemed(true)
    } else {
      setRedeemError(data.error ?? 'Redemption failed')
    }
    setRedeeming(false)
  }

  const showRedeemButton = active && (!giveaway?.trial || trialPassed) && !redeemed

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{fetchError}</p>
      </div>
    )
  }

  if (!giveaway) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-6 text-center shadow-sm">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Dino Giveaway
          </p>
          <h1 className="text-2xl font-bold text-gray-800">{giveaway.dinoName}</h1>
          <p className="text-gray-500 mt-1">{giveaway.growthLabel}</p>
        </div>

        {/* Body */}
        {redeemed ? (
          <p className="text-green-600 font-medium text-sm">
            This giveaway has already been claimed.
          </p>
        ) : (
          <>
            {giveaway.activeAt && !active && (
              <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
            )}

            {active && giveaway.trial && !trialPassed && (
              <TypingTrial
                phrase={giveaway.trial.phrase}
                onSuccess={() => setTrialPassed(true)}
              />
            )}

            {showRedeemButton && (
              <button
                onClick={redeem}
                disabled={redeeming}
                className="py-3 px-8 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {redeeming ? 'Sending…' : '🎁 Redeem'}
              </button>
            )}

            {redeemError && (
              <p className="text-red-500 text-sm">{redeemError}</p>
            )}
          </>
        )}

        {/* Share URL */}
        {shareUrl && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-1">Share this link</p>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="font-mono text-xs break-all text-gray-500 hover:text-blue-600 transition-colors"
              title="Click to copy"
            >
              {shareUrl}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual smoke test — full giveaway flow**

1. Visit `http://localhost:3000`, connect with a real session.
2. Click Gift on an inventory item → configure a giveaway with a typing trial, active time 1 minute in the future.
3. Copy the generated link and open it in a new tab.
4. Verify: countdown shows, trial is hidden behind it.
5. Wait for countdown to expire (or set active time to past for quick test).
6. Verify: typing trial input appears. Enter the wrong phrase → error shown. Enter correct phrase → Redeem button appears.
7. Click Redeem with a real session → verify game API is called.
8. Revisit the same link → "already claimed" message.

- [ ] **Step 4: Commit**

```bash
git add "app/giveaway/[id]/page.tsx"
git commit -m "feat: implement Giveaway recipient page"
```

---

## Task 18: Login and Register draft pages

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/register/page.tsx`

- [ ] **Step 1: Create app/login/page.tsx**

```tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 flex flex-col gap-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 text-center">Login</h1>
        <p className="text-sm text-gray-400 text-center">Coming soon</p>
        <div className="flex flex-col gap-3 opacity-50 pointer-events-none">
          <input
            type="text"
            placeholder="Username"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            disabled
            className="py-2 bg-blue-600 text-white rounded-lg font-medium text-sm"
          >
            Sign in
          </button>
        </div>
        <p className="text-sm text-center text-gray-500">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app/register/page.tsx**

```tsx
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 flex flex-col gap-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 text-center">Register</h1>
        <p className="text-sm text-gray-400 text-center">Coming soon</p>
        <div className="flex flex-col gap-3 opacity-50 pointer-events-none">
          <input
            type="text"
            placeholder="Username"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            disabled
            className="py-2 bg-blue-600 text-white rounded-lg font-medium text-sm"
          >
            Create account
          </button>
        </div>
        <p className="text-sm text-center text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite one final time**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx
git commit -m "feat: add Login and Register draft pages"
```

---

## Implementation complete

All 18 tasks produce a working Next.js 16 App Router app with:

- Inventory page with live slot viewer and hover-to-gift
- Giveaway configurator with datetime, dino picker, optional typing trial
- Generated giveaway page with countdown, trial, and Redeem button
- Route handlers proxying all ageofdino.ru calls server-side
- In-memory mock store swappable for a real DB
- Full test coverage for all logic-bearing lib functions and components
