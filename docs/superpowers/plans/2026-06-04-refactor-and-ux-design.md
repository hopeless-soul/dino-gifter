# Refactor + UX Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise the component/lib structure into grouped sub-directories, fix DTO mismatches in `lib/types.ts`, and redesign the giveaway claiming page, creation page, operator home, and regular home UX per the approved spec.

**Architecture:** All lib files split into `lib/backend/` (auth, session, axios), `lib/crawler/` (game scraping), and `lib/hooks/`. Components split into `layout/`, `game/`, `giveaway/`, `trials/`, `user/`, `regular/`, `operator/`. App pages become thin wrappers; most logic lives in components. UX changes applied as the last set of tasks so each refactor task can be tested independently.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/Radix UI, lucide-react, Axios, Pusher, Cheerio, Vitest.

---

## File Map (all paths that change)

**Lib moves**
| Old | New |
|---|---|
| `lib/auth.ts` | `lib/backend/auth.ts` |
| `lib/session.ts` | `lib/backend/session.ts` |
| `lib/api.ts` | `lib/backend/api.ts` |
| `lib/ageofdino.ts` | `lib/crawler/ageofdino.ts` |
| `lib/parse-slots.ts` | `lib/crawler/parse-slots.ts` |
| `lib/redeem.ts` | `lib/crawler/redeem.ts` |
| `lib/use-auth-user.ts` | `lib/hooks/use-auth-user.ts` |
| `lib/use-session.ts` | `lib/hooks/use-session.ts` |

**Component moves**
| Old | New |
|---|---|
| `components/Navbar.tsx` | `components/layout/Navbar.tsx` |
| `components/AuthGuard.tsx` | `components/layout/AuthGuard.tsx` |
| `components/PusherProvider.tsx` | `components/layout/PusherProvider.tsx` |
| `components/InventoryPanel.tsx` | `components/game/InventoryPanel.tsx` |
| `components/SlotsGrid.tsx` | `components/game/SlotsGrid.tsx` |
| `components/ServerTabs.tsx` | `components/game/ServerTabs.tsx` |
| `components/TrialConfigurator.tsx` | `components/giveaway/TrialConfigurator.tsx` |
| `components/CountdownTimer.tsx` | `components/giveaway/CountdownTimer.tsx` |
| `app/giveaway/new/configurator.tsx` | `components/giveaway/GiveawayConfigurator.tsx` |
| `components/ApiIdCard.tsx` | `components/user/ApiIdCard.tsx` |
| `components/SessionInput.tsx` | `components/user/SessionInput.tsx` |
| `components/TypingTrial.tsx` | `components/trials/TypingTrial.tsx` |

**New files**
- `components/ui/switch.tsx`
- `components/regular/RegularHome.tsx`
- `components/operator/OperatorHome.tsx`

**App pages updated in place**
- `app/layout.tsx` — updated import paths
- `app/page.tsx` — thin wrapper using RegularHome/OperatorHome
- `app/giveaway/new/page.tsx` — updated import
- `app/giveaway/[id]/page.tsx` — full UX redesign
- `app/api/slots/route.ts` — updated imports

**Test files (import path updates only)**
- `components/__tests__/AuthGuard.test.tsx`
- `components/__tests__/CountdownTimer.test.tsx`
- `components/__tests__/TrialConfigurator.test.tsx`
- `components/__tests__/TypingTrial.test.tsx`
- `lib/__tests__/auth.test.ts`
- `lib/__tests__/ageofdino.test.ts`
- `lib/__tests__/redeem.test.ts`

---

## Task 1: DTO Fixes in lib/types.ts

**Files:**
- Modify: `lib/types.ts`
- Modify: `app/giveaway/new/configurator.tsx` (fix `recipient` usage)

- [ ] **Step 1: Update lib/types.ts**

Replace `DinoData`, add `UserMeResponse`, fix `recipient`:

```typescript
// lib/types.ts

// ── Auth ──────────────────────────────────────────────────────────────────────

export type Role = 'Regular' | 'Operator' | 'Admin'

export interface AuthUser {
  id: string
  username: string
  role: Role
  token: string
}

export interface JwtPayload {
  sub: string
  username: string
  role: Role
  tokenVersion: number
}

// ── Game / scraper types ──────────────────────────────────────────────────────

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

// ── Backend giveaway types ────────────────────────────────────────────────────

export interface DinoData {
  id: string
  name: string
  growthLabel: string
  server: string
  slot: string
}

export interface TypingTrialData {
  phrase: string
}

export interface MathTrialData {
  expression: string
  answer: number
}

export interface PuzzleTrialData {
  grid: number[][]
  solution: number[][]
}

export type TrialData =
  | { type: 'typing'; data: TypingTrialData }
  | { type: 'math'; data: MathTrialData }
  | { type: 'puzzle'; data: PuzzleTrialData }

export type CompletionStatus = 'not_processed' | 'pending' | 'processed' | 'failed'

export interface Giveaway {
  id: string
  dino: DinoData
  activeAt: string | null
  trials: TrialData[] | null
  completionStatus: CompletionStatus
  isCanceled: boolean
  createdAt: string
  creator: Partial<{ id: string; username: string }>
  recipient: { id: string; username: string } | null
  server: string | null
  slot: string | null
}

// ── API response types ────────────────────────────────────────────────────────

export interface UserMeResponse {
  apiId: string | null
}
```

- [ ] **Step 2: Fix `recipient` usage in configurator**

In `app/giveaway/new/configurator.tsx`, line 66, change:

```typescript
// OLD
if (!g.recipient && !g.isCanceled && g.server && g.slot) {
// NEW
if (!g.recipient && !g.isCanceled && g.server && g.slot) {
```

Also update the `submit` function to include `server` and `slot` inside the `dino` object (matching `DinoDataDto`):

```typescript
// In submit(), replace the dino object:
dino: {
  id: String(selectedItem.id),
  name: selectedItem.name,
  growthLabel: selectedItem.growthLabel,
  server: activeServer,
  slot: String(autoSlot.slotNumber),
},
```

- [ ] **Step 3: Update ApiIdCard to use UserMeResponse**

In `components/ApiIdCard.tsx`, change:
```typescript
// OLD
api.get<{ apiId: string | null }>('/users/me')
// NEW
import type { UserMeResponse } from '@/lib/types'
api.get<UserMeResponse>('/users/me')
```

- [ ] **Step 4: Run tests**

```
npx vitest run
```
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts app/giveaway/new/configurator.tsx components/ApiIdCard.tsx
git commit -m "fix: correct recipient typo, add server+slot to DinoData, add UserMeResponse"
```

---

## Task 2: Reorganise lib into lib/backend

**Files:**
- Create: `lib/backend/auth.ts`
- Create: `lib/backend/session.ts`
- Create: `lib/backend/api.ts`
- Delete: `lib/auth.ts`, `lib/session.ts`, `lib/api.ts`
- Modify: `lib/use-auth-user.ts` (temp, will move in Task 4)
- Modify: `components/AuthGuard.tsx` (temp, will move in Task 5)
- Modify: `components/ApiIdCard.tsx`
- Modify: `components/PusherProvider.tsx` (partial — auth + session only)
- Modify: `lib/__tests__/auth.test.ts`

- [ ] **Step 1: Create lib/backend/auth.ts**

```typescript
// lib/backend/auth.ts
import type { AuthUser } from '../types'

const KEY = 'dino_auth_user'

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearAuthUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 2: Create lib/backend/session.ts**

```typescript
// lib/backend/session.ts
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

- [ ] **Step 3: Create lib/backend/api.ts**

```typescript
// lib/backend/api.ts
import axios from 'axios'
import { getAuthUser, clearAuthUser } from './auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use(config => {
  const user = getAuthUser()
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearAuthUser()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
```

- [ ] **Step 4: Update all consumers to use new paths**

Update `lib/use-auth-user.ts` imports:
```typescript
import { getAuthUser, clearAuthUser } from './backend/auth'
import api from './backend/api'
```

Update `components/AuthGuard.tsx` import:
```typescript
import { getAuthUser } from '@/lib/backend/auth'
```

Update `components/ApiIdCard.tsx` import:
```typescript
import api from '@/lib/backend/api'
```

Update `components/PusherProvider.tsx` imports:
```typescript
import { getAuthUser } from '@/lib/backend/auth'
import { loadSession } from '@/lib/backend/session'
```
(Keep `import { moveAndGift } from '@/lib/redeem'` for now — crawler move is Task 3.)

Update login/register pages that import from `@/lib/auth` or `@/lib/api`. Check with:
```
grep -r "from '@/lib/auth'" app/ --include="*.tsx" --include="*.ts"
grep -r "from '@/lib/api'" app/ --include="*.tsx" --include="*.ts"
```

For each match, update to `@/lib/backend/auth` or `@/lib/backend/api`.

- [ ] **Step 5: Update lib/__tests__/auth.test.ts imports**

```typescript
import { getAuthUser, setAuthUser, clearAuthUser } from '../backend/auth'
import type { AuthUser } from '../types'
```

- [ ] **Step 6: Delete old lib root files**

```bash
Remove-Item lib/auth.ts
Remove-Item lib/session.ts
Remove-Item lib/api.ts
```

- [ ] **Step 7: Run tests**

```
npx vitest run
```
Expected: all tests pass, including auth.test.ts.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move auth/session/api to lib/backend"
```

---

## Task 3: Reorganise lib into lib/crawler

**Files:**
- Create: `lib/crawler/ageofdino.ts`
- Create: `lib/crawler/parse-slots.ts`
- Create: `lib/crawler/redeem.ts`
- Delete: `lib/ageofdino.ts`, `lib/parse-slots.ts`, `lib/redeem.ts`
- Modify: `app/api/slots/route.ts`
- Modify: `components/PusherProvider.tsx`
- Modify: `lib/__tests__/ageofdino.test.ts`
- Modify: `lib/__tests__/redeem.test.ts`

- [ ] **Step 1: Create lib/crawler/ageofdino.ts**

Copy content verbatim from `lib/ageofdino.ts` — no internal imports to update.

```typescript
// lib/crawler/ageofdino.ts
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

- [ ] **Step 2: Create lib/crawler/parse-slots.ts**

```typescript
// lib/crawler/parse-slots.ts
import * as cheerio from 'cheerio'
import type { InventoryItem, SlotCard } from '../types'

export function parseSlots(html: string): { slots: SlotCard[]; inventory: InventoryItem[] } {
  const $ = cheerio.load(html)

  const inventory: InventoryItem[] = []
  $('#inv_modal .inv_slot').each((_, el) => {
    const id = parseInt($(el).attr('data-inv') ?? '0', 10)
    const name = ($(el).attr('data-name') ?? '').trim()
    const growthLabel = $(el).find('.inv_grow').text().trim()
    const chillStyle = $(el).find('.inv_chill').attr('style') ?? ''
    inventory.push({ id, name, growthLabel, onCooldown: /color:\s*red/i.test(chillStyle) })
  })

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

- [ ] **Step 3: Create lib/crawler/redeem.ts**

```typescript
// lib/crawler/redeem.ts
import { fetchSlotsPage, moveToSlot, sendGift } from './ageofdino'
import { parseSlots } from './parse-slots'

export async function moveAndGift(
  session: string,
  invId: number,
  dinoName: string,
  friendId: string
): Promise<{ ok: boolean; error?: string }> {
  for (const server of ['1', '2', '3']) {
    const htmlBefore = await fetchSlotsPage(session, server)
    const { slots: slotsBefore } = parseSlots(htmlBefore)
    const occupiedBefore = new Set(
      slotsBefore.filter(s => !s.isEmpty).map(s => s.slotNumber)
    )

    const moved = await moveToSlot(session, server, invId)
    if (!moved.ok) continue

    const htmlAfter = await fetchSlotsPage(session, server)
    const { slots: slotsAfter } = parseSlots(htmlAfter)

    const slot =
      slotsAfter.find(
        s => !s.isEmpty && !occupiedBefore.has(s.slotNumber) && s.name === dinoName
      ) ?? slotsAfter.find(s => !s.isEmpty && s.name === dinoName)

    if (!slot) return { ok: false, error: 'Could not locate dino after move' }

    return sendGift(session, server, slot.slotNumber, friendId)
  }
  return { ok: false, error: 'No empty slot available on any server' }
}
```

- [ ] **Step 4: Update app/api/slots/route.ts**

```typescript
import type { NextRequest } from 'next/server'
import { fetchSlotsPage } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

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

- [ ] **Step 5: Update components/PusherProvider.tsx redeem import**

```typescript
import { moveAndGift } from '@/lib/crawler/redeem'
```

- [ ] **Step 6: Update test imports**

`lib/__tests__/ageofdino.test.ts` — change line 2:
```typescript
import { fetchSlotsPage, moveToSlot, sendGift } from '../crawler/ageofdino'
```

`lib/__tests__/redeem.test.ts` — change lines 3-5:
```typescript
import { moveAndGift } from '../crawler/redeem'
import * as ageofdino from '../crawler/ageofdino'
import * as slotParser from '../crawler/parse-slots'
```

`lib/__tests__/parse-slots.test.ts` — update its import (check the file first to find the import line, update `'../parse-slots'` → `'../crawler/parse-slots'`).

- [ ] **Step 7: Delete old crawler files**

```bash
Remove-Item lib/ageofdino.ts
Remove-Item lib/parse-slots.ts
Remove-Item lib/redeem.ts
```

- [ ] **Step 8: Run tests**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: move crawler files to lib/crawler"
```

---

## Task 4: Reorganise lib/hooks

**Files:**
- Create: `lib/hooks/use-auth-user.ts`
- Create: `lib/hooks/use-session.ts`
- Delete: `lib/use-auth-user.ts`, `lib/use-session.ts`
- Modify: `app/page.tsx`, `app/giveaway/new/configurator.tsx`

- [ ] **Step 1: Create lib/hooks/use-auth-user.ts**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthUser, clearAuthUser } from '@/lib/backend/auth'
import api from '@/lib/backend/api'
import type { AuthUser } from '@/lib/types'

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getAuthUser())
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* best-effort */ }
    clearAuthUser()
    setUser(null)
  }, [])

  return { user, setUser, logout }
}
```

- [ ] **Step 2: Create lib/hooks/use-session.ts**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { loadSession, saveSession } from '@/lib/backend/session'

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

- [ ] **Step 3: Update consumers**

`app/page.tsx`:
```typescript
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { useSession } from '@/lib/hooks/use-session'
```

`app/giveaway/new/configurator.tsx`:
```typescript
import { useSession } from '@/lib/hooks/use-session'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
```

`components/Navbar.tsx` (check if it imports `useAuthUser` — it does):
```typescript
import { useAuthUser } from '@/lib/hooks/use-auth-user'
```

Search for any other consumers:
```bash
grep -r "from '@/lib/use-auth-user'" --include="*.tsx" --include="*.ts"
grep -r "from '@/lib/use-session'" --include="*.tsx" --include="*.ts"
```
Update each match.

- [ ] **Step 4: Delete old hook files**

```bash
Remove-Item lib/use-auth-user.ts
Remove-Item lib/use-session.ts
```

- [ ] **Step 5: Run tests**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move hooks to lib/hooks"
```

---

## Task 5: Move layout components

**Files:**
- Create: `components/layout/Navbar.tsx`
- Create: `components/layout/AuthGuard.tsx`
- Create: `components/layout/PusherProvider.tsx`
- Delete originals at `components/`
- Modify: `app/layout.tsx`
- Modify: `components/__tests__/AuthGuard.test.tsx`

- [ ] **Step 1: Create components/layout/Navbar.tsx**

```typescript
'use client'

import { Pacifico } from 'next/font/google'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { Badge } from '@/components/ui/badge'

const pacifico = Pacifico({ weight: '400', subsets: ['latin'] })

export function Navbar() {
  const { user, logout } = useAuthUser()
  const router = useRouter()

  return (
    <header className="border-b border-border px-4 py-3 flex items-center gap-4 fixed top-0 left-0 right-0 z-50 bg-background">
      <Link href="/"><h1 className={`text-base text-foreground ${pacifico.className}`}>Dino Gifter</h1></Link>
      <nav className="flex gap-4 text-sm ml-auto items-center">
        {user ? (
          <>
            <Badge>{user.username}</Badge>
            <button
              onClick={async () => { await logout(); router.replace('/login') }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">Register</Link>
          </>
        )}
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Create components/layout/AuthGuard.tsx**

```typescript
'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAuthUser } from '@/lib/backend/auth'

const PUBLIC_PATHS = ['/login', '/register']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!PUBLIC_PATHS.includes(pathname) && !getAuthUser()) {
      router.replace('/login')
    }
  }, [pathname, router])

  return <>{children}</>
}
```

- [ ] **Step 3: Create components/layout/PusherProvider.tsx**

```typescript
'use client'
import { useEffect } from 'react'
import Pusher from 'pusher-js'
import api from '@/lib/backend/api'
import { getAuthUser } from '@/lib/backend/auth'
import { loadSession } from '@/lib/backend/session'
import { moveAndGift } from '@/lib/crawler/redeem'
import type { DinoData } from '@/lib/types'

interface GiftDinoPayload {
  giveawayId: string
  dino: DinoData
  recipientApiId: string
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const user = getAuthUser()
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!user || !key || !cluster) return

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        customHandler: async ({ socketId, channelName }, callback) => {
          try {
            const { data } = await api.post('/pusher/auth', {
              socket_id: socketId,
              channel_name: channelName,
            })
            callback(null, data)
          } catch {
            callback(new Error('Pusher auth failed'), null)
          }
        },
      },
    })

    const channel = pusher.subscribe(`private-user-${user.id}`)

    channel.bind('gift_dino', async (payload: GiftDinoPayload) => {
      const session = loadSession()
      if (!session) return
      try {
        const result = await moveAndGift(
          session,
          parseInt(payload.dino.id, 10),
          payload.dino.name,
          payload.recipientApiId,
        )
        if (!result.ok) {
          console.error('[gift_dino] moveAndGift failed:', result.error)
        }
      } catch (err) {
        console.error('[gift_dino] unexpected error:', err)
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 4: Update app/layout.tsx imports**

```typescript
import { AuthGuard } from "@/components/layout/AuthGuard";
import { PusherProvider } from "@/components/layout/PusherProvider";
import { Navbar } from "@/components/layout/Navbar";
```

- [ ] **Step 5: Update AuthGuard test import**

`components/__tests__/AuthGuard.test.tsx` line 3:
```typescript
import { AuthGuard } from '../layout/AuthGuard'
```

- [ ] **Step 6: Delete old files**

```bash
Remove-Item components/Navbar.tsx
Remove-Item components/AuthGuard.tsx
Remove-Item components/PusherProvider.tsx
```

- [ ] **Step 7: Run tests**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move layout components to components/layout"
```

---

## Task 6: Move game components

**Files:**
- Create: `components/game/InventoryPanel.tsx`
- Create: `components/game/SlotsGrid.tsx`
- Create: `components/game/ServerTabs.tsx`
- Delete originals

- [ ] **Step 1: Create components/game/InventoryPanel.tsx**

Copy content of `components/InventoryPanel.tsx` verbatim — no import path changes needed (it only imports from `@/lib/types`, `@/components/ui/*`, `next/navigation`).

- [ ] **Step 2: Create components/game/SlotsGrid.tsx**

Copy content of `components/SlotsGrid.tsx` verbatim — no import path changes needed.

- [ ] **Step 3: Create components/game/ServerTabs.tsx**

Copy content of `components/ServerTabs.tsx` verbatim — no import path changes needed.

- [ ] **Step 4: Update all consumers**

Search for old import paths:
```bash
grep -r "components/InventoryPanel" --include="*.tsx" --include="*.ts"
grep -r "components/SlotsGrid" --include="*.tsx" --include="*.ts"
grep -r "components/ServerTabs" --include="*.tsx" --include="*.ts"
```

In `app/page.tsx`, update:
```typescript
import { InventoryPanel } from '@/components/game/InventoryPanel'
import { ServerTabs } from '@/components/game/ServerTabs'
import { SlotsGrid } from '@/components/game/SlotsGrid'
```

In `app/giveaway/new/configurator.tsx`, update:
```typescript
import { ServerTabs } from '@/components/game/ServerTabs'
```

- [ ] **Step 5: Delete old files**

```bash
Remove-Item components/InventoryPanel.tsx
Remove-Item components/SlotsGrid.tsx
Remove-Item components/ServerTabs.tsx
```

- [ ] **Step 6: Run tests, commit**

```
npx vitest run
```
```bash
git add -A
git commit -m "refactor: move game components to components/game"
```

---

## Task 7: Move giveaway components

**Files:**
- Create: `components/giveaway/CountdownTimer.tsx`
- Create: `components/giveaway/TrialConfigurator.tsx`
- Create: `components/giveaway/GiveawayConfigurator.tsx` (from app/)
- Delete: `components/CountdownTimer.tsx`, `components/TrialConfigurator.tsx`, `app/giveaway/new/configurator.tsx`
- Modify: `app/giveaway/new/page.tsx`
- Modify: `app/giveaway/[id]/page.tsx`
- Modify: `components/__tests__/CountdownTimer.test.tsx`
- Modify: `components/__tests__/TrialConfigurator.test.tsx`

- [ ] **Step 1: Create components/giveaway/CountdownTimer.tsx**

Copy content of `components/CountdownTimer.tsx` verbatim — no import changes needed.

- [ ] **Step 2: Create components/giveaway/TrialConfigurator.tsx**

Copy content of `components/TrialConfigurator.tsx` with updated imports:
```typescript
import { TypingTrialEditor } from '@/components/trials/TypingTrialEditor'
import { MathTrialEditor } from '@/components/trials/MathTrialEditor'
import { PuzzleTrialEditor } from '@/components/trials/PuzzleTrialEditor'
```
(All other imports already use `@/` paths and don't change.)

- [ ] **Step 3: Create components/giveaway/GiveawayConfigurator.tsx**

Copy content of `app/giveaway/new/configurator.tsx` with these import updates:
```typescript
import { useSession } from '@/lib/hooks/use-session'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import api from '@/lib/backend/api'
import { ServerTabs } from '@/components/game/ServerTabs'
import { TrialConfigurator } from '@/components/giveaway/TrialConfigurator'
```

- [ ] **Step 4: Update app/giveaway/new/page.tsx**

```typescript
import { Suspense } from 'react'
import { GiveawayConfigurator } from '@/components/giveaway/GiveawayConfigurator'

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

- [ ] **Step 5: Update app/giveaway/[id]/page.tsx imports**

```typescript
import { CountdownTimer } from '@/components/giveaway/CountdownTimer'
import { TypingTrial } from '@/components/trials/TypingTrial'
```
(MathTrialPlayer and PuzzleTrialPlayer are already in `@/components/trials/`.)
Remove unused `CardSimIcon` import.

- [ ] **Step 6: Update test imports**

`components/__tests__/CountdownTimer.test.tsx`:
```typescript
import { formatCountdown } from '../giveaway/CountdownTimer'
```

`components/__tests__/TrialConfigurator.test.tsx`:
```typescript
import { TrialConfigurator } from '../giveaway/TrialConfigurator'
```

- [ ] **Step 7: Delete old files**

```bash
Remove-Item components/CountdownTimer.tsx
Remove-Item components/TrialConfigurator.tsx
Remove-Item app/giveaway/new/configurator.tsx
```

- [ ] **Step 8: Run tests, commit**

```
npx vitest run
```
```bash
git add -A
git commit -m "refactor: move giveaway components to components/giveaway"
```

---

## Task 8: Move user and trial components

**Files:**
- Create: `components/user/ApiIdCard.tsx`
- Create: `components/user/SessionInput.tsx`
- Create: `components/trials/TypingTrial.tsx`
- Delete originals
- Modify: `app/page.tsx`, `components/__tests__/TypingTrial.test.tsx`

- [ ] **Step 1: Create components/user/ApiIdCard.tsx**

Copy content of `components/ApiIdCard.tsx` with updated imports:
```typescript
import api from '@/lib/backend/api'
import type { UserMeResponse } from '@/lib/types'
// Update the api.get call:
api.get<UserMeResponse>('/users/me')
```

- [ ] **Step 2: Create components/user/SessionInput.tsx**

Copy content of `components/SessionInput.tsx` verbatim — no lib imports, only ui components.

- [ ] **Step 3: Create components/trials/TypingTrial.tsx**

Copy content of `components/TypingTrial.tsx` verbatim — no import changes needed.

- [ ] **Step 4: Update consumers**

`app/page.tsx`:
```typescript
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { SessionInput } from '@/components/user/SessionInput'
```

Search for any other imports:
```bash
grep -r "components/ApiIdCard\|components/SessionInput\|components/TypingTrial" --include="*.tsx"
```
Update each to the new paths.

`app/giveaway/[id]/page.tsx` already updated in Task 7 step 5.

- [ ] **Step 5: Update TypingTrial test import**

`components/__tests__/TypingTrial.test.tsx`:
```typescript
import { TypingTrial } from '../trials/TypingTrial'
```

- [ ] **Step 6: Delete old files**

```bash
Remove-Item components/ApiIdCard.tsx
Remove-Item components/SessionInput.tsx
Remove-Item components/TypingTrial.tsx
```

- [ ] **Step 7: Run tests, commit**

```
npx vitest run
```
```bash
git add -A
git commit -m "refactor: move user and trial components to their groups"
```

---

## Task 9: Extract RegularHome and OperatorHome from app/page.tsx

**Files:**
- Create: `components/regular/RegularHome.tsx`
- Create: `components/operator/OperatorHome.tsx`
- Modify: `app/page.tsx`

The extracted components will carry their current logic unchanged; UX improvements come in Tasks 10 and 11.

- [ ] **Step 1: Create components/regular/RegularHome.tsx**

```typescript
'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/backend/api'
import { Card, CardContent } from '@/components/ui/card'
import { ApiIdCard } from '@/components/user/ApiIdCard'
import type { Giveaway } from '@/lib/types'

export function RegularHome() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  return (
    <main className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <ApiIdCard />

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Claimed Giveaways
        </h2>
        {giveaways.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No claimed giveaways yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {giveaways.map(g => (
              <Card key={g.id}>
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{g.dino.name}</p>
                    <p className="text-sm text-muted-foreground">{g.dino.growthLabel}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Create components/operator/OperatorHome.tsx**

Extract the `OperatorHome` function and `Countdown` helper from `app/page.tsx`. Update all import paths. The `statusBadgeClass` map and `Countdown` helper move into this file.

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import api from '@/lib/backend/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway, InventoryItem, SlotCard } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/lib/hooks/use-session'
import { SessionInput } from '@/components/user/SessionInput'
import { InventoryPanel } from '@/components/game/InventoryPanel'
import { ServerTabs } from '@/components/game/ServerTabs'
import { SlotsGrid } from '@/components/game/SlotsGrid'
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { Badge } from '@/components/ui/badge'
import { Check, ClipboardCopy, ExternalLink, Gift, Plus } from 'lucide-react'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

const statusBadgeClass: Record<string, string> = {
  not_processed: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-900/40 text-yellow-300',
  processed: 'bg-green-900/40 text-green-300',
  failed: 'bg-red-900/40 text-red-300',
}

function Countdown({ activeAt }: { activeAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!activeAt) return
    const target = new Date(activeAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeAt])

  if (remaining === null) return null

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const label = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return <span className="text-xs font-mono text-muted-foreground">{label}</span>
}

export function OperatorHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [session, setSession] = useSession()
  const [connected, setConnected] = useState(false)
  const [loadingInv, setLoadingInv] = useState(false)
  const [invError, setInvError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [activeServer, setActiveServer] = useState('1')

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  async function connectInventory() {
    if (!session.trim()) return
    setLoadingInv(true)
    setInvError(null)
    try {
      const results: { slots: SlotCard[]; inventory: InventoryItem[] }[] = []
      for (const server of ['1', '2', '3']) {
        const res = await fetch(`/api/slots?server=${server}`, {
          headers: { 'x-user-session': session },
        })
        if (!res.ok) {
          const d = await res.json() as { error: string }
          throw new Error(res.status === 401 ? 'Session invalid or expired' : d.error)
        }
        results.push(await res.json())
      }
      setInventory(results[0].inventory)
      setServerSlots({ '1': results[0].slots, '2': results[1].slots, '3': results[2].slots })
      setConnected(true)
    } catch (e) {
      setInvError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoadingInv(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      <div className='flex gap-6 mb-6 sm:flex-col md:flex-row'>
        <SessionInput
          value={session}
          onChange={setSession}
          onConnect={connectInventory}
          loading={loadingInv}
          error={invError}
        />
        <ApiIdCard />
      </div>

      <Tabs defaultValue="giveaways">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="giveaways">Giveaways</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => router.push('/giveaway/new')}>
            <Plus size={12} /> New Giveaway
          </Button>
        </div>

        <TabsContent value="giveaways">
          {giveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No giveaways yet.</p>
          ) : (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Giveaways — {giveaways.length} items
              </h2>
              <ScrollArea className="h-128 w-full rounded-md border p-4">
                <ScrollBar />
                <div className="flex w-full flex-col gap-4 p-2 overflow-y-auto">
                  {giveaways.map((g) => (
                    <Item className='w-full' variant='muted' key={g.id}>
                      <HoverCard openDelay={10} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <ItemMedia variant='image' style={{ background: 'var(--muted)' }}>
                            <Gift size='21' />
                          </ItemMedia>
                        </HoverCardTrigger>
                        <HoverCardContent className="flex w-72 flex-col gap-0.5 ml-56">
                          <div className="font-semibold font-[12px] mb-2">{g.dino.name}</div>
                          <div className='text-xs text-muted-foreground'>{g.id}</div>
                          <div className='flex gap-2 mt-1 text-xs text-muted-foreground'>
                            <div>Trials:</div>
                            {g.trials && g.trials.map((trial, i) => (
                              <div key={i} style={{ transform: 'translateY(-2px)' }}>
                                <Badge variant='secondary'>{trial.type}</Badge>
                                {g.trials && i < (g.trials.length - 1) && (<span>&nbsp;→</span>)}
                              </div>
                            ))}
                            {!g.trials && <p className='italic'>null</p>}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Gift Status:&nbsp;&nbsp;{g.completionStatus}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Created:&nbsp;&nbsp;{new Date(g.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Active:&nbsp;&nbsp;<Countdown activeAt={g.activeAt} />
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <ItemContent className='gap-1'>
                        <ItemTitle>{g.dino.name}</ItemTitle>
                        <ItemDescription>{g.dino.growthLabel}</ItemDescription>
                      </ItemContent>
                      <div className="py-3 px-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass[g.completionStatus] ?? 'bg-muted'}`}>
                            {g.completionStatus.replaceAll('_', ' ')}
                          </span>
                          <Countdown activeAt={g.activeAt} />
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ItemActions>
                        <Button size='icon' onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/giveaway/${g.id}`)
                          setCopiedId(g.id)
                          setTimeout(() => setCopiedId(null), 1500)
                        }}>
                          <span className="relative w-4 h-4">
                            <ClipboardCopy size={16} className={`absolute inset-0 transition-all duration-200 ${copiedId === g.id ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                            <Check size={16} className={`absolute inset-0 transition-all duration-200 ${copiedId === g.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                          </span>
                        </Button>
                      </ItemActions>
                      <ItemActions>
                        <Button size='icon' variant='ghost' onClick={() => window.open(`/giveaway/${g.id}`, '_blank')}>
                          <ExternalLink size={16} />
                        </Button>
                      </ItemActions>
                    </Item>
                  ))}
                </div>
              </ScrollArea>
            </section>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          {connected && (
            <div className="flex flex-col gap-6 mt-4">
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Inventory — {inventory.length} items
                </h2>
                <Card className="overflow-hidden">
                  <InventoryPanel items={inventory} />
                </Card>
              </section>
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Server Slots
                </h2>
                <Card className="overflow-hidden">
                  <ServerTabs active={activeServer} onChange={setActiveServer} />
                  <SlotsGrid slots={serverSlots[activeServer] ?? []} />
                </Card>
              </section>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
```

- [ ] **Step 3: Rewrite app/page.tsx as a thin wrapper**

```typescript
'use client'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { RegularHome } from '@/components/regular/RegularHome'
import { OperatorHome } from '@/components/operator/OperatorHome'

export default function HomePage() {
  const { user } = useAuthUser()
  if (!user) return null
  return (
    <div className="flex flex-col items-center mt-16 max-h-screen bg-background">
      {user.role === 'Regular' ? <RegularHome /> : <OperatorHome />}
    </div>
  )
}
```

- [ ] **Step 4: Run tests, commit**

```
npx vitest run
```
```bash
git add -A
git commit -m "refactor: extract RegularHome and OperatorHome to components"
```

---

## Task 10: UX — Operator Home visual improvements

**Files:**
- Modify: `components/operator/OperatorHome.tsx`
- Modify: `components/game/SlotsGrid.tsx` (add giveaway state props)

Changes per spec: white New Giveaway button, monochrome status pills, HH:MM countdown (no seconds, always shown), giveaway-aware slot states.

- [ ] **Step 1: Update SlotsGrid to support giveaway states**

Replace `components/game/SlotsGrid.tsx` entirely:

```typescript
import { cn } from '@/lib/utils'
import type { SlotCard, Giveaway } from '@/lib/types'

type SlotState = 'empty' | 'active-giveaway' | 'scheduled-giveaway' | 'busy'

function getSlotState(slot: SlotCard, server: string, giveaways: Giveaway[]): SlotState {
  const giveaway = giveaways.find(
    g =>
      g.server === server &&
      g.slot === String(slot.slotNumber) &&
      g.completionStatus === 'not_processed' &&
      !g.isCanceled
  )
  if (giveaway) {
    const scheduled = giveaway.activeAt && new Date(giveaway.activeAt) > new Date()
    return scheduled ? 'scheduled-giveaway' : 'active-giveaway'
  }
  if (slot.isEmpty) return 'empty'
  return 'busy'
}

function formatTimeUntil(activeAt: string): string {
  const ms = new Date(activeAt).getTime() - Date.now()
  if (ms <= 0) return '0:00'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

interface Props {
  slots: SlotCard[]
  server?: string
  giveaways?: Giveaway[]
}

export function SlotsGrid({ slots, server = '1', giveaways = [] }: Props) {
  if (slots.length === 0) {
    return <p className="text-muted-foreground text-sm py-6 px-4 text-center">No slots found.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
      {slots.map(slot => {
        const state = getSlotState(slot, server, giveaways)
        const relatedGiveaway = giveaways.find(
          g => g.server === server && g.slot === String(slot.slotNumber) && g.completionStatus === 'not_processed'
        )
        return (
          <div
            key={slot.slotNumber}
            className={cn(
              'border rounded-lg p-3 text-sm',
              state === 'empty' && 'border-dashed border-border/50 text-muted-foreground bg-muted/20',
              state === 'active-giveaway' && 'border-purple-900/40 bg-purple-950/20 text-purple-300',
              state === 'scheduled-giveaway' && 'border-dashed border-purple-900/30 bg-purple-950/10 text-purple-400/60',
              state === 'busy' && 'border-border bg-card opacity-50 cursor-not-allowed',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Slot {slot.slotNumber}</p>
            {slot.isEmpty ? (
              <p className="italic text-xs">Empty</p>
            ) : (
              <>
                <p className="font-medium truncate">{slot.name}</p>
                <p className="text-xs mt-0.5 opacity-70">{slot.growthLabel}</p>
              </>
            )}
            {state === 'active-giveaway' && (
              <p className="text-xs mt-1 opacity-70">↑ active giveaway</p>
            )}
            {state === 'scheduled-giveaway' && relatedGiveaway?.activeAt && (
              <p className="text-xs mt-1 opacity-70">⏳ starts in {formatTimeUntil(relatedGiveaway.activeAt)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update OperatorHome with all visual changes**

Apply the following targeted changes to `components/operator/OperatorHome.tsx`:

**a) Change status pills to always monochrome:**
```typescript
// Replace statusBadgeClass entirely:
const statusBadgeClass: Record<string, string> = {
  not_processed: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
  processed: 'bg-muted text-muted-foreground',
  failed: 'bg-muted text-muted-foreground',
}
```

**b) Change New Giveaway button to white:**
```typescript
// Find the New Giveaway Button and add className:
<Button
  size="sm"
  className="bg-white text-black hover:bg-white/90"
  onClick={() => router.push('/giveaway/new')}
>
  <Plus size={12} /> New Giveaway
</Button>
```

**c) Change Gift icon in ItemMedia to white:**
```typescript
<ItemMedia variant='image' style={{ background: 'var(--muted)' }}>
  <Gift size='21' className="text-white" />
</ItemMedia>
```

**d) Replace the local `Countdown` helper with HH:MM format (no seconds, always shown, 0:00 when expired):**

```typescript
function CountdownHHMM({ activeAt }: { activeAt: string | null }) {
  const [label, setLabel] = useState('0:00')

  useEffect(() => {
    if (!activeAt) return
    const target = new Date(activeAt).getTime()
    const tick = () => {
      const ms = Math.max(0, target - Date.now())
      const totalMin = Math.floor(ms / 60000)
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      setLabel(ms === 0 ? '0:00' : `${h}:${String(m).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 10000)  // update every 10s — minute precision
    return () => clearInterval(id)
  }, [activeAt])

  if (!activeAt) return null
  return <span className="text-xs font-mono text-muted-foreground">{label}</span>
}
```

Replace the `Countdown` usages inside the giveaway list with `CountdownHHMM`. Keep the `Countdown` component in the HoverCard (the spec only changes the in-list display).

**e) Pass `server` and `giveaways` to SlotsGrid:**
```typescript
<SlotsGrid
  slots={serverSlots[activeServer] ?? []}
  server={activeServer}
  giveaways={giveaways}
/>
```

- [ ] **Step 3: Run tests, commit**

```
npx vitest run
```
```bash
git add -A
git commit -m "feat: operator home UX improvements — monochrome pills, white button, giveaway slots"
```

---

## Task 11: UX — Regular User Home redesign

**Files:**
- Modify: `components/regular/RegularHome.tsx`

Changes: API ID card already matches operator (shared component). Claimed giveaways list changes to item-list style with lucide Gift icon, dino name + growth + creator, date, ExternalLink button.

- [ ] **Step 1: Rewrite components/regular/RegularHome.tsx**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/backend/api'
import { ApiIdCard } from '@/components/user/ApiIdCard'
import { Button } from '@/components/ui/button'
import { Gift, ExternalLink } from 'lucide-react'
import type { Giveaway } from '@/lib/types'

export function RegularHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  return (
    <main className="max-w-xl w-full mx-auto p-4 flex flex-col gap-4">
      <ApiIdCard />

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Claimed Giveaways
        </p>

        <div className="border border-border rounded-xl p-2 flex flex-col gap-1.5">
          {giveaways.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">
              No claimed giveaways yet.
            </p>
          ) : (
            giveaways.map(g => (
              <div
                key={g.id}
                className="bg-muted/30 border border-border/60 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-border transition-colors cursor-pointer"
                onClick={() => router.push(`/giveaway/${g.id}`)}
              >
                <div className="w-9 h-9 bg-muted border border-border/50 rounded-lg flex items-center justify-center shrink-0">
                  <Gift size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{g.dino.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.dino.growthLabel}
                    {g.creator.username ? ` · from ${g.creator.username}` : ''}
                  </p>
                </div>
                <p className="text-xs font-mono text-muted-foreground/60 shrink-0">
                  {new Date(g.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={e => { e.stopPropagation(); window.open(`/giveaway/${g.id}`, '_blank') }}
                >
                  <ExternalLink size={13} />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Run tests, commit**

```
npx vitest run
```
```bash
git add components/regular/RegularHome.tsx
git commit -m "feat: regular home UX — item list for claimed giveaways"
```

---

## Task 12: UX — Giveaway Claiming Page redesign

**Files:**
- Modify: `app/giveaway/[id]/page.tsx`

Layout: desktop two-column (hero+status left, trial right), mobile single column. Status card fixed height with 4 absolutely-positioned states. Redeem button has 3 visual states. Trial content has dot indicator.

- [ ] **Step 1: Rewrite app/giveaway/[id]/page.tsx**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/backend/api'
import { CountdownTimer } from '@/components/giveaway/CountdownTimer'
import { TypingTrial } from '@/components/trials/TypingTrial'
import { MathTrialPlayer } from '@/components/trials/MathTrialPlayer'
import { PuzzleTrialPlayer } from '@/components/trials/PuzzleTrialPlayer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway, TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'
import { Gift, Trophy, ClipboardCopy, Check } from 'lucide-react'

export default function GiveawayPage() {
  const { id } = useParams<{ id: string }>()

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [trialIndex, setTrialIndex] = useState(0)
  const [trialsComplete, setTrialsComplete] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    api.get<Giveaway>(`/giveaway/${id}`)
      .then(({ data }) => {
        setGiveaway(data)
        if (data.isCanceled) { setFetchError('This giveaway has been canceled.'); return }
        if (data.completionStatus !== 'not_processed') setRedeemed(true)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) setActive(true)
        if (!data.trials || data.trials.length === 0) setTrialsComplete(true)
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  const advanceTrial = useCallback(() => {
    const total = giveaway?.trials?.length ?? 0
    setTrialIndex(i => {
      if (i + 1 >= total) { setTrialsComplete(true); return i }
      return i + 1
    })
  }, [giveaway])

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      await api.post(`/giveaway/${id}`)
      const { data } = await api.get<Giveaway>(`/giveaway/${id}`)
      setGiveaway(data)
      setRedeemed(true)
    } catch {
      setRedeemError('Redemption failed. Try again.')
    } finally {
      setRedeeming(false)
    }
  }

  function copyShare() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function renderTrial(trial: TrialData) {
    if (trial.type === 'typing') return <TypingTrial phrase={(trial.data as TypingTrialData).phrase} onSuccess={advanceTrial} />
    if (trial.type === 'math') return <MathTrialPlayer data={trial.data as MathTrialData} onSuccess={advanceTrial} />
    return <PuzzleTrialPlayer data={trial.data as PuzzleTrialData} onSuccess={advanceTrial} />
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }
  if (fetchError) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive text-sm">{fetchError}</p></div>
  }
  if (!giveaway) return null

  const trialCount = giveaway.trials?.length ?? 0
  const currentTrial = giveaway.trials?.[trialIndex]

  // Redeem button state
  const redeemDisabled = redeeming || !active || (trialCount > 0 && !trialsComplete)

  // Status card states
  const showCountdown = !active
  const showTrialProgress = active && trialCount > 0 && !trialsComplete
  const showTrialsDone = active && (trialCount === 0 || trialsComplete) && !redeemed
  const showClaimed = redeemed

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background flex flex-col md:flex-row items-start justify-center gap-4 px-4 py-8 mt-16">

      {/* Left column */}
      <div className="flex flex-col gap-4 w-full md:w-80 shrink-0">

        {/* Hero card */}
        <Card>
          <CardHeader className="text-center pb-0 pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {giveaway.creator.username ?? '—'} gives away
            </p>
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5a4af4 0%, #7c5cbf 100%)' }}
              >
                <Gift size={38} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{giveaway.dino.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {giveaway.dino.growthLabel}
              {giveaway.server ? ` · ${giveaway.server}` : ''}
            </p>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pt-5 pb-5">
            {/* Redeem button */}
            {redeemed ? (
              <Button
                disabled
                size="lg"
                className="w-full opacity-40"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                🎁 Redeemed
              </Button>
            ) : (
              <Button
                onClick={redeem}
                disabled={redeemDisabled}
                size="lg"
                className="w-full"
                variant={redeemDisabled ? 'secondary' : 'default'}
              >
                {redeeming ? 'Sending…' : '🎁 Redeem'}
              </Button>
            )}

            {redeemError && <p className="text-destructive text-sm text-center">{redeemError}</p>}

            {/* Share URL */}
            {shareUrl && (
              <button
                onClick={copyShare}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono break-all text-center"
                title="Click to copy"
              >
                <span className="relative w-3 h-3 flex-shrink-0">
                  <ClipboardCopy size={12} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-0 scale-75' : 'opacity-100'}`} />
                  <Check size={12} className={`absolute inset-0 transition-all duration-150 ${copied ? 'opacity-100' : 'opacity-0 scale-75'}`} />
                </span>
                {shareUrl}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Status card — fixed height, no layout jump */}
        <Card className="relative overflow-hidden" style={{ minHeight: '160px' }}>

          {/* State 1: Countdown */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-300 ${showCountdown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Available in</p>
            {giveaway.activeAt && (
              <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
            )}
          </div>

          {/* State 2: Trial progress */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 transition-opacity duration-300 ${showTrialProgress ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {currentTrial ? currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(0, 6) + ' Trial' : ''}
              </p>
              <p className="text-sm font-mono mt-0.5 text-foreground">{trialIndex + 1} / {trialCount}</p>
            </div>
            <div className="flex gap-1 w-full">
              {Array.from({ length: trialCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= trialIndex ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>

          {/* State 3: All trials done (or no trials) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 transition-opacity duration-300 ${showTrialsDone ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {trialCount > 0 ? (
              <>
                <div className="text-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Done</p>
                  <p className="text-sm font-mono mt-0.5 text-foreground">{trialCount} / {trialCount}</p>
                </div>
                <div className="flex gap-1 w-full">
                  {Array.from({ length: trialCount }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">All trials complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ready to redeem</p>
            )}
          </div>

          {/* State 4: Claimed */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${showClaimed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: showClaimed ? 'linear-gradient(135deg, #1a1040 0%, #0d1530 100%)' : undefined }}
          >
            <Trophy size={32} className="text-purple-400" />
            <p className="font-semibold text-white text-sm">{giveaway.recipient?.username ?? '—'}</p>
            <p className="text-xs text-purple-300">Claimed this gift</p>
          </div>

        </Card>
      </div>

      {/* Right column: trial content */}
      {trialCount > 0 && active && currentTrial && !trialsComplete && (
        <Card className="flex-1 w-full flex flex-col min-h-[400px] md:self-stretch">
          <CardHeader className="text-center pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {currentTrial.type.charAt(0).toUpperCase() + currentTrial.type.slice(1)} Trial
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4 items-center justify-center">
            {renderTrial(currentTrial)}
          </CardContent>
          {/* Dot indicator */}
          {trialCount > 1 && (
            <div className="flex justify-center gap-1.5 pb-4">
              {Array.from({ length: trialCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === trialIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests, commit**

```
npx vitest run
```
```bash
git add app/giveaway/[id]/page.tsx
git commit -m "feat: giveaway claiming page UX redesign — two-column layout, fixed-height status card"
```

---

## Task 13: UX — Creation Page redesign

**Files:**
- Create: `components/ui/switch.tsx`
- Modify: `components/giveaway/GiveawayConfigurator.tsx`

Changes: Generate Link button pins to bottom of config card, trial card slides in/out with CSS width transition, Switch replaces Checkbox for Enable Trials, equal-height card layout.

- [ ] **Step 1: Add Switch component**

First check if `@radix-ui/react-switch` is available:
```bash
node -e "require('@radix-ui/react-switch'); console.log('ok')"
```

If not installed:
```bash
npm install @radix-ui/react-switch
```

Create `components/ui/switch.tsx`:

```typescript
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

- [ ] **Step 2: Rewrite GiveawayConfigurator with new layout and transitions**

Replace `components/giveaway/GiveawayConfigurator.tsx` with the updated version. Key structural changes from the current file:
- Outer container uses `items-stretch` so cards share height
- Config card: `flex flex-col` with `mt-auto` on the Generate Link button
- Slots card: `flex-1`, inner scroll area on the slot grid
- Trial card: wrapped in an animated-width div

```typescript
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/hooks/use-session'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import api from '@/lib/backend/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ServerTabs } from '@/components/game/ServerTabs'
import { TrialConfigurator } from '@/components/giveaway/TrialConfigurator'
import type { InventoryItem, SlotCard, TrialData, Giveaway } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuthUser()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState('')

  const [activeServer, setActiveServer] = useState('1')
  const [serverSlots, setServerSlots] = useState<Record<string, SlotCard[]>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set())
  const loadedServers = useRef(new Set<string>())

  const [activeAt, setActiveAt] = useState('')
  const [trialsEnabled, setTrialsEnabled] = useState(false)
  const [trials, setTrials] = useState<TrialData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role === 'Regular') router.replace('/')
  }, [user, router])

  useEffect(() => {
    const id = params.get('invId')
    if (id) setInvId(id)
  }, [params])

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
    api.get<Giveaway[]>('/giveaway')
      .then(({ data }) => {
        const blocked = new Set<string>()
        data.forEach(g => {
          if (!g.recipient && !g.isCanceled && g.server && g.slot) {
            blocked.add(`${g.server}-${g.slot}`)
          }
        })
        setBlockedSlots(blocked)
      })
      .catch(() => {})
  }, [])

  const fetchServerSlots = useCallback(async (server: string) => {
    if (!session || loadedServers.current.has(server)) return
    loadedServers.current.add(server)
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/slots?server=${server}`, {
        headers: { 'x-user-session': session },
      })
      if (res.ok) {
        const data = await res.json() as { slots: SlotCard[] }
        setServerSlots(prev => ({ ...prev, [server]: data.slots }))
      } else {
        loadedServers.current.delete(server)
      }
    } catch {
      loadedServers.current.delete(server)
    } finally {
      setLoadingSlots(false)
    }
  }, [session])

  useEffect(() => { fetchServerSlots(activeServer) }, [activeServer, fetchServerSlots])

  const autoSlot = (serverSlots[activeServer] ?? []).find(
    s => s.isEmpty && !blockedSlots.has(`${activeServer}-${s.slotNumber}`)
  ) ?? null

  const selectedItem = inventory.find(i => i.id === parseInt(invId, 10))

  async function submit() {
    if (!invId) { setError('Select a dino.'); return }
    if (!autoSlot) { setError('No available slot on this server — all are reserved.'); return }
    if (trialsEnabled && trials.length === 0) { setError('Add at least one trial or disable Enable Trials.'); return }
    if (!selectedItem) { setError('Selected dino is no longer available.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post<{ id: string }>('/giveaway', {
        dino: {
          id: String(selectedItem.id),
          name: selectedItem.name,
          growthLabel: selectedItem.growthLabel,
          server: activeServer,
          slot: String(autoSlot.slotNumber),
        },
        activeAt: activeAt ? new Date(activeAt).toISOString() : null,
        trials: trialsEnabled && trials.length > 0 ? trials : null,
        server: activeServer,
        slot: String(autoSlot.slotNumber),
      })
      setSubmitting(false)
      router.push(`/giveaway/${data.id}`)
    } catch {
      setError('Failed to create giveaway. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4 pb-12">
      <div className="flex gap-4 w-full max-w-6xl items-stretch">

        {/* Config card — fixed width, Generate Link pinned to bottom */}
        <Card className="w-60 shrink-0 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                aria-label="Back"
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                ←
              </Button>
              <CardTitle className="text-base">Configure Giveaway</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-2 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label>Dino</Label>
              {!session ? (
                <p className="text-sm text-muted-foreground">No game session — connect in Inventory tab first.</p>
              ) : inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading inventory…</p>
              ) : (
                <Select value={invId} onValueChange={setInvId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dino…" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name} — {item.growthLabel}
                        {item.onCooldown ? ' (cooldown)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {autoSlot !== null && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground mb-0.5">Auto-selected slot</p>
                <p className="font-medium">Server {activeServer} · Slot {autoSlot.slotNumber}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Active at (optional)</Label>
              <Input
                type="datetime-local"
                value={activeAt}
                onChange={e => setActiveAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to activate immediately.</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="trials"
                checked={trialsEnabled}
                onCheckedChange={setTrialsEnabled}
              />
              <Label htmlFor="trials" className="cursor-pointer">Enable Trials</Label>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {/* Pin Generate Link to bottom */}
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !invId || !autoSlot}
              size="lg"
              className="w-full mt-auto"
            >
              {submitting ? 'Generating link…' : 'Generate Link'}
            </Button>
          </CardContent>
        </Card>

        {/* Slots card */}
        <Card className="flex-1 min-w-0 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Server Slots</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {!session ? (
              <p className="text-sm text-muted-foreground px-4 py-4">No game session — connect first.</p>
            ) : (
              <>
                <ServerTabs active={activeServer} onChange={setActiveServer} />
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground px-4 py-4">Loading…</p>
                ) : (serverSlots[activeServer] ?? []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                    {serverSlots[activeServer].map(slot => {
                      const isBlocked = blockedSlots.has(`${activeServer}-${slot.slotNumber}`)
                      const isAuto = autoSlot?.slotNumber === slot.slotNumber
                      return (
                        <div
                          key={slot.slotNumber}
                          className={cn(
                            'border rounded-lg p-3 text-sm select-none',
                            isBlocked
                              ? 'border-destructive/30 bg-destructive/10 text-muted-foreground'
                              : isAuto
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : slot.isEmpty
                                  ? 'border-dashed border-border/50 text-muted-foreground bg-muted/20'
                                  : 'border-border bg-card'
                          )}
                        >
                          <p className="text-xs text-muted-foreground mb-1">Slot {slot.slotNumber}</p>
                          {slot.isEmpty ? (
                            <p className="italic text-xs">Empty</p>
                          ) : (
                            <>
                              <p className="font-medium truncate text-card-foreground">{slot.name}</p>
                              <p className="text-muted-foreground text-xs mt-0.5">{slot.growthLabel}</p>
                            </>
                          )}
                          {isBlocked && <p className="text-xs text-destructive/70 mt-1">Active giveaway</p>}
                          {isAuto && <p className="text-xs text-primary mt-1">← selected</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground px-4 py-4">No slots found.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Trial card — animated width slide */}
        <div
          style={{
            width: trialsEnabled ? '320px' : '0px',
            overflow: 'hidden',
            transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
          }}
        >
          <Card className="flex flex-col h-full" style={{ minWidth: '320px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trial Configurator</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <TrialConfigurator trials={trials} onChange={setTrials} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: creation page UX — slide-in trial card, pinned generate button, switch toggle"
```

---

## Self-Review

**Spec coverage check:**
- Part 1 (structural refactor) → Tasks 2-9 ✓
- Part 2 (DTO fixes) → Task 1 ✓
- Part 3 (giveaway claiming page UX) → Task 12 ✓
- Part 4 (creation page UX) → Task 13 ✓
- Part 5 (operator home UX) → Task 10 ✓
- Part 6 (regular user home UX) → Task 11 ✓
- HoverCard preservation → explicit in Task 9 (OperatorHome extraction keeps HoverCard intact) ✓
- `recipient` → `recipient` fix → Task 1 ✓
- `UserMeResponse` type → Task 1 ✓
- Pacifico logo font → Navbar already uses it; kept in Task 5 ✓
- White New Giveaway button → Task 10 ✓
- Monochrome status pills → Task 10 ✓
- HH:MM countdown in list (no seconds) → Task 10 ✓
- 4-state SlotsGrid → Task 10 ✓
- Giveaway item list (RegularHome) → Task 11 ✓
- Two-column claiming page → Task 12 ✓
- Fixed-height status card with 4 states → Task 12 ✓
- Redeem button 3 states → Task 12 ✓
- Dot indicator for trials → Task 12 ✓
- Re-fetch giveaway after redeem (to get recipient) → Task 12 ✓
- Switch instead of Checkbox → Task 13 ✓
- Generate Link pinned to bottom → Task 13 ✓
- Trial card animated width → Task 13 ✓

**Type consistency check:**
- `DinoData` with `server: string, slot: string` is defined in Task 1 and used in GiveawayConfigurator submit (Task 13) ✓
- `Giveaway.recipient` (not `recipient`) consistent across all tasks ✓
- `SlotsGrid` updated signature `{ slots, server?, giveaways? }` defined in Task 10, called in OperatorHome Task 10 ✓
- `UserMeResponse` defined in Task 1, used in ApiIdCard Task 8 ✓
- `useAuthUser` from `@/lib/hooks/use-auth-user` consistent in all tasks after Task 4 ✓
- `api` from `@/lib/backend/api` consistent after Task 2 ✓

**Placeholder scan:** None found.

**Test path updates:** All test files (`AuthGuard`, `CountdownTimer`, `TrialConfigurator`, `TypingTrial`, `auth`, `ageofdino`, `redeem`) have their import paths updated in the relevant tasks.
