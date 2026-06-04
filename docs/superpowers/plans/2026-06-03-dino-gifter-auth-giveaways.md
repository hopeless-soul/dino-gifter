# Dino Gifter — Auth, Giveaways & Pusher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock in-memory giveaway system with real NestJS backend auth, role-based home page, multi-trial giveaway creation/claiming, and Pusher-driven dino transfer.

**Architecture:** Frontend calls NestJS directly via an axios singleton (`withCredentials: true`); httpOnly cookie handles auth automatically. On login the JWT is decoded from the response body to extract `{id, role, username}` stored in localStorage. Pusher uses a `customHandler` that routes through the same axios instance for channel auth.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Radix UI, axios, jwt-decode, pusher-js, Vitest + Testing Library

---

## Pre-flight: Backend changes required before testing any frontend task

The following NestJS changes **must exist** before the frontend can function end-to-end:

1. `giveaway.gateway.ts` — emit `gift_dino` (not `move_dino`)
2. `giveaway.service.ts` — use `u.apiId` (not `u.id`) in `emitMoveDino`
3. `UsersController` — add `GET /users/me` returning `{id, username, role, apiId}`
4. `UsersController` — add `PATCH /users` using `@CurrentUser()` accepting `{apiId: string}`
5. `GiveawayController` — add `GET /giveaway/won` returning giveaways where `recipient = currentUser`
6. NestJS CORS — allow `http://localhost:3000` with credentials

Frontend unit tests are independent of the backend. Integration testing requires all six changes above.

---

## File Map

**New files:**
- `lib/types.ts` — updated shared types (replaces old)
- `lib/auth.ts` — localStorage auth helpers
- `lib/use-auth-user.ts` — auth hook
- `lib/api.ts` — axios instance
- `components/AuthGuard.tsx` — redirect unauthenticated users
- `components/PusherProvider.tsx` — Pusher lifecycle
- `components/TrialConfigurator.tsx` — trial list editor (creation side)
- `components/trials/TypingTrialEditor.tsx`
- `components/trials/MathTrialEditor.tsx`
- `components/trials/PuzzleTrialEditor.tsx`
- `components/trials/MathTrialPlayer.tsx`
- `components/trials/PuzzleTrialPlayer.tsx`

**Modified:**
- `app/layout.tsx` — add AuthGuard + PusherProvider
- `app/page.tsx` — role-based home page (full rewrite)
- `app/login/page.tsx` — implement login form
- `app/register/page.tsx` — implement register form
- `app/giveaway/new/configurator.tsx` — rewrite for backend API + trial configurator
- `app/giveaway/[id]/page.tsx` — extend to handle full trial sequence

**Deleted:**
- `app/api/giveaways/route.ts`
- `app/api/giveaways/[id]/route.ts`
- `app/api/giveaways/[id]/redeem/route.ts`
- `lib/friends.ts`
- `lib/mock-store.ts`
- `lib/__tests__/mock-store.test.ts`

**Kept unchanged:**
- `lib/redeem.ts` — `moveAndGift` still used by PusherProvider
- `lib/ageofdino.ts`, `lib/parse-slots.ts`, `lib/session.ts`
- `app/api/slots/route.ts`
- All `components/ui/*`
- `components/TypingTrial.tsx` — reused as-is on the claiming page
- `components/CountdownTimer.tsx`

---

## Task 1: Install packages, add env file, delete dead code

**Files:**
- Modify: `package.json`
- Create: `.env.local` (not committed; example shown below)
- Delete: `app/api/giveaways/route.ts`, `app/api/giveaways/[id]/route.ts`, `app/api/giveaways/[id]/redeem/route.ts`, `lib/friends.ts`, `lib/mock-store.ts`, `lib/__tests__/mock-store.test.ts`

- [ ] **Step 1: Install new packages**

```bash
npm install axios jwt-decode pusher-js
```

Expected output: 3 packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Create `.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key_here
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster_here
```

- [ ] **Step 3: Delete old API routes and dead lib files**

```bash
rm app/api/giveaways/route.ts
rm app/api/giveaways/[id]/route.ts
rm "app/api/giveaways/[id]/redeem/route.ts"
rm lib/friends.ts
rm lib/mock-store.ts
rm lib/__tests__/mock-store.test.ts
```

- [ ] **Step 4: Run tests to confirm no broken imports**

```bash
npm test
```

Expected: previously-passing tests still pass; mock-store tests are gone. If any test imports `lib/friends` or `lib/mock-store`, fix the import.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install axios/jwt-decode/pusher-js, delete mock giveaway system"
```

---

## Task 2: Update `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// lib/types.ts

// ── Auth ──────────────────────────────────────────────────────────────────────

export type Role = 'Regular' | 'Operator' | 'Admin'

export interface AuthUser {
  id: string
  username: string
  role: Role
}

// ── Game / scraper types (unchanged — used by inventory tab) ─────────────────

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
}

export interface TypingTrialData {
  phrase: string
}

export interface MathTrialData {
  expression: string
  answer: number
}

export interface PuzzleTrialData {
  grid: number[][]       // 9×9; 0 = empty cell, 1–9 = given value
  solution: number[][]   // 9×9; complete solution
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
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass. Fix any test that imports removed types (`TypingTrial`, `GiveawayConfig`, `Friend`, `PublicGiveaway`).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "refactor: replace types with auth + backend giveaway types"
```

---

## Task 3: Auth utilities (`lib/auth.ts`)

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getAuthUser, setAuthUser, clearAuthUser } from '../auth'
import type { AuthUser } from '../types'

const USER: AuthUser = { id: 'abc-123', username: 'tester', role: 'Regular' }

beforeEach(() => {
  localStorage.clear()
})

describe('getAuthUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getAuthUser()).toBeNull()
  })
  it('returns the stored user after setAuthUser', () => {
    setAuthUser(USER)
    expect(getAuthUser()).toEqual(USER)
  })
})

describe('setAuthUser', () => {
  it('persists the user to localStorage', () => {
    setAuthUser(USER)
    const raw = localStorage.getItem('dino_auth_user')
    expect(JSON.parse(raw!)).toEqual(USER)
  })
})

describe('clearAuthUser', () => {
  it('removes the user from localStorage', () => {
    setAuthUser(USER)
    clearAuthUser()
    expect(getAuthUser()).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
npm test lib/__tests__/auth.test.ts
```

Expected: FAIL — `Cannot find module '../auth'`

- [ ] **Step 3: Implement `lib/auth.ts`**

```ts
// lib/auth.ts
import type { AuthUser } from './types'

const KEY = 'dino_auth_user'

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearAuthUser(): void {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test lib/__tests__/auth.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat: auth localStorage helpers"
```

---

## Task 4: API client (`lib/api.ts`)

**Files:**
- Create: `lib/api.ts`

- [ ] **Step 1: Create the axios instance**

```ts
// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

export default api
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass (no tests for this file — it is a thin wrapper).

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: axios instance with withCredentials"
```

---

## Task 5: `useAuthUser` hook (`lib/use-auth-user.ts`)

**Files:**
- Create: `lib/use-auth-user.ts`

- [ ] **Step 1: Implement the hook**

```ts
// lib/use-auth-user.ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAuthUser, clearAuthUser } from './auth'
import api from './api'
import type { AuthUser } from './types'

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

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add lib/use-auth-user.ts
git commit -m "feat: useAuthUser hook"
```

---

## Task 6: `AuthGuard` + `app/layout.tsx`

**Files:**
- Create: `components/AuthGuard.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/AuthGuard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { AuthGuard } from '../AuthGuard'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/some-protected-route',
}))

beforeEach(() => {
  localStorage.clear()
  mockReplace.mockClear()
})

describe('AuthGuard', () => {
  it('redirects to /login when no auth user is present', () => {
    render(<AuthGuard><div>protected</div></AuthGuard>)
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when auth user is present', () => {
    localStorage.setItem('dino_auth_user', JSON.stringify({ id: '1', username: 'u', role: 'Regular' }))
    render(<AuthGuard><div>protected</div></AuthGuard>)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test components/__tests__/AuthGuard.test.tsx
```

Expected: FAIL — `Cannot find module '../AuthGuard'`

- [ ] **Step 3: Implement `components/AuthGuard.tsx`**

```tsx
// components/AuthGuard.tsx
'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

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

- [ ] **Step 4: Run test — verify it PASSES**

```bash
npm test components/__tests__/AuthGuard.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Update `app/layout.tsx` to include AuthGuard**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dino Gifter',
  description: 'Manage and gift your Age of Dino dinosaurs',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/AuthGuard.tsx components/__tests__/AuthGuard.test.tsx app/layout.tsx
git commit -m "feat: AuthGuard redirects unauthenticated users to /login"
```

---

## Task 7: Login page (`app/login/page.tsx`)

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Rewrite the login page**

```tsx
// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { setAuthUser } from '@/lib/auth'
import type { AuthUser } from '@/lib/types'

interface JwtPayload {
  sub: string
  username: string
  role: AuthUser['role']
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ access_token: string }>('/auth/login', { username, password })
      const payload = jwtDecode<JwtPayload>(data.access_token)
      setAuthUser({ id: payload.sub, username: payload.username, role: payload.role })
      router.push('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-primary hover:underline">Register</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: implement login page with JWT decode"
```

---

## Task 8: Register page (`app/register/page.tsx`)

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Rewrite the register page**

```tsx
// app/register/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { setAuthUser } from '@/lib/auth'
import type { AuthUser } from '@/lib/types'

interface JwtPayload {
  sub: string
  username: string
  role: AuthUser['role']
}

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register', { username, password })
      const { data } = await api.post<{ access_token: string }>('/auth/login', { username, password })
      const payload = jwtDecode<JwtPayload>(data.access_token)
      setAuthUser({ id: payload.sub, username: payload.username, role: payload.role })
      router.push('/')
    } catch {
      setError('Registration failed. Username may already be taken.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline">Login</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat: implement register page with auto-login"
```

---

## Task 9: Home page — Regular user view

**Files:**
- Modify: `app/page.tsx` (first pass — Regular user section only)

- [ ] **Step 1: Rewrite `app/page.tsx` with role-based structure and Regular user view**

```tsx
// app/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/use-auth-user'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Giveaway } from '@/lib/types'

// ── Regular user ──────────────────────────────────────────────────────────────

function RegularHome() {
  const [apiId, setApiId] = useState('')
  const [saving, setSaving] = useState(false)
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  useEffect(() => {
    api.get<{ apiId: string | null }>('/users/me')
      .then(({ data }) => { if (data.apiId) setApiId(data.apiId) })
      .catch(() => {})
    api.get<Giveaway[]>('/giveaway/won')
      .then(({ data }) => setGiveaways(data))
      .catch(() => {})
  }, [])

  async function saveApiId() {
    setSaving(true)
    try { await api.patch('/users', { apiId }) } finally { setSaving(false) }
  }

  return (
    <main className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your API ID</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={apiId}
            onChange={e => setApiId(e.target.value)}
            placeholder="Your in-game user ID"
          />
          <Button onClick={saveApiId} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Claimed Giveaways
        </h2>
        {giveaways.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claimed giveaways yet.</p>
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

// ── Placeholder for Operator view (Task 10) ───────────────────────────────────

function OperatorHome() {
  return <div className="p-4 text-muted-foreground text-sm">Operator view — coming in next task</div>
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, logout } = useAuthUser()
  const router = useRouter()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <h1 className="text-base font-bold text-foreground">🦕 Dino Gifter</h1>
        <nav className="flex gap-4 text-sm ml-auto items-center">
          <span className="text-muted-foreground">{user.username}</span>
          <button
            onClick={async () => { await logout(); router.replace('/login') }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </nav>
      </header>

      {user.role === 'Regular' ? <RegularHome /> : <OperatorHome />}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: home page with Regular user view (apiId + claimed giveaways)"
```

---

## Task 10: Home page — Operator/Admin view (tabs + inventory)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `OperatorHome` with full tabs implementation**

Find the `OperatorHome` function and replace it (plus add the missing imports at the top):

Additional imports to add at the top of `app/page.tsx`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/lib/use-session'
import { SessionInput } from '@/components/SessionInput'
import { InventoryPanel } from '@/components/InventoryPanel'
import { ServerTabs } from '@/components/ServerTabs'
import { SlotsGrid } from '@/components/SlotsGrid'
import type { InventoryItem, SlotCard } from '@/lib/types'
```

Replace the `OperatorHome` function:

```tsx
function OperatorHome() {
  const router = useRouter()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])

  // Inventory tab state
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

  const statusBadgeClass: Record<string, string> = {
    not_processed: 'bg-muted text-muted-foreground',
    pending: 'bg-yellow-900/40 text-yellow-300',
    processed: 'bg-green-900/40 text-green-300',
    failed: 'bg-red-900/40 text-red-300',
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      <Tabs defaultValue="giveaways">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="giveaways">Giveaways</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => router.push('/giveaway/new')}>
            + New Giveaway
          </Button>
        </div>

        <TabsContent value="giveaways">
          {giveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No giveaways yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {giveaways.map(g => (
                <Card key={g.id}>
                  <CardContent className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{g.dino.name}</p>
                      <p className="text-sm text-muted-foreground">{g.dino.growthLabel}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass[g.completionStatus] ?? 'bg-muted'}`}>
                        {g.completionStatus.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          <SessionInput
            value={session}
            onChange={setSession}
            onConnect={connectInventory}
            loading={loadingInv}
            error={invError}
          />
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

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: home page Operator view with Giveaways/Inventory tabs"
```

---

## Task 11: Trial editor components

**Files:**
- Create: `components/trials/TypingTrialEditor.tsx`
- Create: `components/trials/MathTrialEditor.tsx`
- Create: `components/trials/PuzzleTrialEditor.tsx`
- Create: `components/TrialConfigurator.tsx`
- Create: `components/__tests__/TrialConfigurator.test.tsx`

- [ ] **Step 1: Create `components/trials/TypingTrialEditor.tsx`**

```tsx
// components/trials/TypingTrialEditor.tsx
'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TypingTrialData } from '@/lib/types'

interface Props {
  data: TypingTrialData
  onChange: (data: TypingTrialData) => void
}

export function TypingTrialEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground font-normal text-xs">Phrase to type exactly</Label>
      <Input
        value={data.phrase}
        onChange={e => onChange({ phrase: e.target.value })}
        placeholder="e.g. I love Theri"
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `components/trials/MathTrialEditor.tsx`**

```tsx
// components/trials/MathTrialEditor.tsx
'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MathTrialData } from '@/lib/types'

interface Props {
  data: MathTrialData
  onChange: (data: MathTrialData) => void
}

export function MathTrialEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Expression</Label>
        <Input
          value={data.expression}
          onChange={e => onChange({ ...data, expression: e.target.value })}
          placeholder="e.g. 12 × 4 + 7"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground font-normal text-xs">Answer</Label>
        <Input
          type="number"
          value={data.answer === 0 ? '' : data.answer}
          onChange={e => onChange({ ...data, answer: Number(e.target.value) || 0 })}
          placeholder="55"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/trials/PuzzleTrialEditor.tsx`**

```tsx
// components/trials/PuzzleTrialEditor.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PuzzleTrialData } from '@/lib/types'

type Mode = 'puzzle' | 'solution'

interface Props {
  data: PuzzleTrialData
  onChange: (data: PuzzleTrialData) => void
}

export function PuzzleTrialEditor({ data, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('puzzle')

  function updateCell(r: number, c: number, raw: string) {
    const n = Math.max(0, Math.min(9, parseInt(raw) || 0))
    const grid = data.grid.map(row => [...row])
    const solution = data.solution.map(row => [...row])
    if (mode === 'puzzle') {
      grid[r][c] = n
      solution[r][c] = n
    } else {
      if (data.grid[r][c] !== 0) return
      solution[r][c] = n
    }
    onChange({ grid, solution })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'puzzle' ? 'default' : 'outline'}
          onClick={() => setMode('puzzle')}
        >
          Set Puzzle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'solution' ? 'default' : 'outline'}
          onClick={() => setMode('solution')}
        >
          Set Solution
        </Button>
      </div>

      <div
        className="grid border border-border"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 28px)', width: 'fit-content' }}
      >
        {data.grid.map((row, r) =>
          row.map((_, c) => {
            const isGiven = data.grid[r][c] !== 0
            const displayVal = mode === 'puzzle' ? data.grid[r][c] : data.solution[r][c]
            return (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={displayVal || ''}
                readOnly={mode === 'solution' && isGiven}
                onChange={e => updateCell(r, c, e.target.value)}
                className={cn(
                  'w-7 h-7 text-center text-xs border-border/40 border focus:outline-none focus:bg-primary/10',
                  isGiven && mode === 'solution' && 'font-bold bg-muted cursor-not-allowed',
                  c === 2 && 'border-r-2 border-r-border',
                  c === 5 && 'border-r-2 border-r-border',
                  r === 2 && 'border-b-2 border-b-border',
                  r === 5 && 'border-b-2 border-b-border',
                )}
              />
            )
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === 'puzzle'
          ? 'Fill the starting cells. Switch to "Set Solution" to enter the answer.'
          : 'Fill all empty cells with the correct solution.'}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Write the failing test for `TrialConfigurator`**

```tsx
// components/__tests__/TrialConfigurator.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrialConfigurator } from '../TrialConfigurator'

describe('TrialConfigurator', () => {
  it('renders an Add Trial button', () => {
    render(<TrialConfigurator trials={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add trial/i })).toBeInTheDocument()
  })

  it('calls onChange with a new typing trial when + is clicked and type selected', () => {
    const onChange = vi.fn()
    render(<TrialConfigurator trials={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /add trial/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'typing' }),
      ])
    )
  })

  it('removes a trial when ✕ is clicked', () => {
    const onChange = vi.fn()
    const trials = [{ type: 'typing' as const, data: { phrase: 'hello' } }]
    render(<TrialConfigurator trials={trials} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 5: Run test — verify it FAILS**

```bash
npm test components/__tests__/TrialConfigurator.test.tsx
```

Expected: FAIL — `Cannot find module '../TrialConfigurator'`

- [ ] **Step 6: Create `components/TrialConfigurator.tsx`**

```tsx
// components/TrialConfigurator.tsx
'use client'
import { useId } from 'react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TypingTrialEditor } from '@/components/trials/TypingTrialEditor'
import { MathTrialEditor } from '@/components/trials/MathTrialEditor'
import { PuzzleTrialEditor } from '@/components/trials/PuzzleTrialEditor'
import type { TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'

interface TrialEntry {
  localId: string
  trial: TrialData
}

interface Props {
  trials: TrialData[]
  onChange: (trials: TrialData[]) => void
}

function emptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

function defaultTrial(type: TrialData['type']): TrialData {
  if (type === 'typing') return { type: 'typing', data: { phrase: '' } }
  if (type === 'math') return { type: 'math', data: { expression: '', answer: 0 } }
  return { type: 'puzzle', data: { grid: emptyGrid(), solution: emptyGrid() } }
}

export function TrialConfigurator({ trials, onChange }: Props) {
  const entries: TrialEntry[] = trials.map((t, i) => ({ localId: String(i), trial: t }))

  function emit(updated: TrialEntry[]) {
    onChange(updated.map(e => e.trial))
  }

  function addTrial() {
    emit([...entries, { localId: nanoid(), trial: defaultTrial('typing') }])
  }

  function removeTrial(localId: string) {
    emit(entries.filter(e => e.localId !== localId))
  }

  function changeType(localId: string, type: TrialData['type']) {
    emit(entries.map(e => e.localId === localId ? { ...e, trial: defaultTrial(type) } : e))
  }

  function changeData(localId: string, data: TypingTrialData | MathTrialData | PuzzleTrialData) {
    emit(entries.map(e => {
      if (e.localId !== localId) return e
      return { ...e, trial: { ...e.trial, data } as TrialData }
    }))
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <div
          key={entry.localId}
          className="p-3 bg-background rounded-md border border-border flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Trial {i + 1}
            </span>
            <button
              type="button"
              aria-label="Remove trial"
              onClick={() => removeTrial(entry.localId)}
              className="text-muted-foreground hover:text-destructive text-sm leading-none"
            >
              ✕
            </button>
          </div>

          <Select value={entry.trial.type} onValueChange={v => changeType(entry.localId, v as TrialData['type'])}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typing">Typing</SelectItem>
              <SelectItem value="math">Math</SelectItem>
              <SelectItem value="puzzle">Puzzle (Sudoku)</SelectItem>
            </SelectContent>
          </Select>

          {entry.trial.type === 'typing' && (
            <TypingTrialEditor
              data={entry.trial.data as TypingTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
          {entry.trial.type === 'math' && (
            <MathTrialEditor
              data={entry.trial.data as MathTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
          {entry.trial.type === 'puzzle' && (
            <PuzzleTrialEditor
              data={entry.trial.data as PuzzleTrialData}
              onChange={d => changeData(entry.localId, d)}
            />
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addTrial} className="w-full">
        + Add Trial
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: Run tests — verify they PASS**

```bash
npm test components/__tests__/TrialConfigurator.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/trials/ components/TrialConfigurator.tsx components/__tests__/TrialConfigurator.test.tsx
git commit -m "feat: trial editor components (typing, math, puzzle Sudoku)"
```

---

## Task 12: Giveaway creation rewrite (`app/giveaway/new/configurator.tsx`)

**Files:**
- Modify: `app/giveaway/new/configurator.tsx`

- [ ] **Step 1: Rewrite the configurator**

```tsx
// app/giveaway/new/configurator.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import { useAuthUser } from '@/lib/use-auth-user'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrialConfigurator } from '@/components/TrialConfigurator'
import type { InventoryItem, TrialData } from '@/lib/types'

export function GiveawayConfigurator() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [session] = useSession()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [invId, setInvId] = useState('')
  const [activeAt, setActiveAt] = useState('')
  const [trialsEnabled, setTrialsEnabled] = useState(false)
  const [trials, setTrials] = useState<TrialData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Role guard — Regular users cannot create giveaways
  useEffect(() => {
    if (user && user.role === 'Regular') router.replace('/')
  }, [user, router])

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

  const selectedItem = inventory.find(i => i.id === parseInt(invId, 10))

  async function submit() {
    if (!invId) { setError('Select a dino.'); return }
    if (trialsEnabled && trials.length === 0) { setError('Add at least one trial or uncheck Enable Trials.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.post<{ id: string }>('/giveaway', {
        dino: {
          id: String(selectedItem!.id),
          name: selectedItem!.name,
          growthLabel: selectedItem!.growthLabel,
        },
        activeAt: activeAt ? new Date(activeAt).toISOString() : null,
        trials: trialsEnabled && trials.length > 0 ? trials : null,
      })
      router.push(`/giveaway/${data.id}`)
    } catch {
      setError('Failed to create giveaway. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4 pb-12">
      <div className={trialsEnabled ? 'flex gap-4 w-full max-w-3xl' : 'w-full max-w-md'}>

        {/* Left: giveaway config */}
        <Card className={trialsEnabled ? 'flex-1' : 'w-full'}>
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
              <CardTitle className="text-lg">Configure Giveaway</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-2">
            {/* Dino picker */}
            <div className="flex flex-col gap-1.5">
              <Label>Dino</Label>
              {!session ? (
                <p className="text-sm text-muted-foreground">No game session — go to Inventory tab and connect first.</p>
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

            {/* Active at */}
            <div className="flex flex-col gap-1.5">
              <Label>Active at (optional)</Label>
              <Input
                type="datetime-local"
                value={activeAt}
                onChange={e => setActiveAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty to activate immediately.</p>
            </div>

            {/* Trials toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="trials"
                checked={trialsEnabled}
                onCheckedChange={checked => setTrialsEnabled(!!checked)}
              />
              <Label htmlFor="trials" className="cursor-pointer">Enable Trials</Label>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !invId}
              size="lg"
              className="w-full"
            >
              {submitting ? 'Generating link…' : 'Generate Link'}
            </Button>
          </CardContent>
        </Card>

        {/* Right: trial configurator (only when trialsEnabled) */}
        {trialsEnabled && (
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trial Configurator</CardTitle>
            </CardHeader>
            <CardContent>
              <TrialConfigurator trials={trials} onChange={setTrials} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/giveaway/new/configurator.tsx
git commit -m "feat: giveaway creation rewrite with multi-trial configurator and backend API"
```

---

## Task 13: Trial player components (claiming side)

**Files:**
- Create: `components/trials/MathTrialPlayer.tsx`
- Create: `components/trials/PuzzleTrialPlayer.tsx`
- Create: `components/__tests__/MathTrialPlayer.test.tsx`
- Create: `components/__tests__/PuzzleTrialPlayer.test.tsx`

- [ ] **Step 1: Write failing tests for `MathTrialPlayer`**

```tsx
// components/__tests__/MathTrialPlayer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MathTrialPlayer } from '../trials/MathTrialPlayer'

const DATA = { expression: '3 + 4', answer: 7 }

describe('MathTrialPlayer', () => {
  it('displays the expression', () => {
    render(<MathTrialPlayer data={DATA} onSuccess={vi.fn()} />)
    expect(screen.getByText('3 + 4')).toBeInTheDocument()
  })

  it('calls onSuccess when correct answer is submitted', () => {
    const onSuccess = vi.fn()
    render(<MathTrialPlayer data={DATA} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not call onSuccess for wrong answer', () => {
    const onSuccess = vi.fn()
    render(<MathTrialPlayer data={DATA} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows error text for wrong answer', () => {
    render(<MathTrialPlayer data={DATA} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npm test components/__tests__/MathTrialPlayer.test.tsx
```

Expected: FAIL — `Cannot find module '../trials/MathTrialPlayer'`

- [ ] **Step 3: Implement `components/trials/MathTrialPlayer.tsx`**

```tsx
// components/trials/MathTrialPlayer.tsx
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MathTrialData } from '@/lib/types'

interface Props {
  data: MathTrialData
  onSuccess: () => void
}

export function MathTrialPlayer({ data, onSuccess }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (Number(input) === data.answer) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <p className="text-sm text-muted-foreground">Solve the expression:</p>
      <div className="text-2xl font-bold font-mono px-4 py-2 bg-muted rounded-md">
        {data.expression}
      </div>
      <Input
        type="number"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Your answer"
        className="text-center max-w-xs"
      />
      {error && <p className="text-destructive text-sm">Incorrect answer. Try again.</p>}
      <Button onClick={submit}>Next →</Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
npm test components/__tests__/MathTrialPlayer.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Write failing tests for `PuzzleTrialPlayer`**

```tsx
// components/__tests__/PuzzleTrialPlayer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PuzzleTrialPlayer } from '../trials/PuzzleTrialPlayer'
import type { PuzzleTrialData } from '@/lib/types'

// Minimal 9×9 grid: all zeros for grid, specific values in solution
function makeData(solution: number[][]): PuzzleTrialData {
  return {
    grid: Array.from({ length: 9 }, () => Array(9).fill(0)),
    solution,
  }
}

const FULL_SOLUTION = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => ((r * 9 + c) % 9) + 1)
)

describe('PuzzleTrialPlayer', () => {
  it('renders 81 input cells', () => {
    const data = makeData(FULL_SOLUTION)
    render(<PuzzleTrialPlayer data={data} onSuccess={vi.fn()} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(81)
  })

  it('"Next" button is disabled when grid is not solved', () => {
    const data = makeData(FULL_SOLUTION)
    render(<PuzzleTrialPlayer data={data} onSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onSuccess when all cells match the solution', () => {
    const onSuccess = vi.fn()
    // Simple 1-cell puzzle: grid all zeros, solution first cell = 5
    const solution = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (r === 0 && c === 0 ? 5 : 1))
    )
    const data = makeData(solution)
    render(<PuzzleTrialPlayer data={data} onSuccess={onSuccess} />)

    // Fill every input with the correct solution value
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input, idx) => {
      const r = Math.floor(idx / 9)
      const c = idx % 9
      fireEvent.change(input, { target: { value: String(solution[r][c]) } })
    })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 6: Run test — verify FAIL**

```bash
npm test components/__tests__/PuzzleTrialPlayer.test.tsx
```

Expected: FAIL — `Cannot find module '../trials/PuzzleTrialPlayer'`

- [ ] **Step 7: Implement `components/trials/PuzzleTrialPlayer.tsx`**

```tsx
// components/trials/PuzzleTrialPlayer.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PuzzleTrialData } from '@/lib/types'

interface Props {
  data: PuzzleTrialData
  onSuccess: () => void
}

export function PuzzleTrialPlayer({ data, onSuccess }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    data.grid.map(row => [...row])
  )

  function updateCell(r: number, c: number, raw: string) {
    if (data.grid[r][c] !== 0) return
    const n = Math.max(0, Math.min(9, parseInt(raw) || 0))
    setGrid(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = n
      return next
    })
  }

  const isSolved = grid.every((row, r) =>
    row.every((cell, c) => cell === data.solution[r][c])
  )

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <p className="text-sm text-muted-foreground">Complete the Sudoku puzzle:</p>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 28px)', width: 'fit-content' }}
        className="border border-border"
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isGiven = data.grid[r][c] !== 0
            return (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={cell || ''}
                readOnly={isGiven}
                onChange={e => updateCell(r, c, e.target.value)}
                className={cn(
                  'w-7 h-7 text-center text-xs border-border/40 border focus:outline-none focus:bg-primary/10',
                  isGiven && 'font-bold bg-muted cursor-not-allowed',
                  c === 2 && 'border-r-2 border-r-border',
                  c === 5 && 'border-r-2 border-r-border',
                  r === 2 && 'border-b-2 border-b-border',
                  r === 5 && 'border-b-2 border-b-border',
                )}
              />
            )
          })
        )}
      </div>
      <Button onClick={onSuccess} disabled={!isSolved}>Next →</Button>
    </div>
  )
}
```

- [ ] **Step 8: Run tests — verify they PASS**

```bash
npm test components/__tests__/PuzzleTrialPlayer.test.tsx components/__tests__/MathTrialPlayer.test.tsx
```

Expected: 7 tests pass total.

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add components/trials/MathTrialPlayer.tsx components/trials/PuzzleTrialPlayer.tsx components/__tests__/MathTrialPlayer.test.tsx components/__tests__/PuzzleTrialPlayer.test.tsx
git commit -m "feat: MathTrialPlayer and PuzzleTrialPlayer components with tests"
```

---

## Task 14: Giveaway claiming page rewrite (`app/giveaway/[id]/page.tsx`)

**Files:**
- Modify: `app/giveaway/[id]/page.tsx`

- [ ] **Step 1: Rewrite the claiming page**

```tsx
// app/giveaway/[id]/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { CountdownTimer } from '@/components/CountdownTimer'
import { TypingTrial } from '@/components/TypingTrial'
import { MathTrialPlayer } from '@/components/trials/MathTrialPlayer'
import { PuzzleTrialPlayer } from '@/components/trials/PuzzleTrialPlayer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Giveaway, TrialData, TypingTrialData, MathTrialData, PuzzleTrialData } from '@/lib/types'

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
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    setShareUrl(window.location.href.split('?')[0])
  }, [])

  useEffect(() => {
    api.get<Giveaway>(`/giveaway/${id}`)
      .then(({ data }) => {
        setGiveaway(data)
        if (data.completionStatus !== 'not_processed') setRedeemed(true)
        if (!data.activeAt || new Date(data.activeAt) <= new Date()) setActive(true)
        if (!data.trials || data.trials.length === 0) setTrialsComplete(true)
      })
      .catch(() => setFetchError('Could not load this giveaway.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleActive = useCallback(() => setActive(true), [])

  function advanceTrial() {
    const total = giveaway?.trials?.length ?? 0
    if (trialIndex + 1 >= total) {
      setTrialsComplete(true)
    } else {
      setTrialIndex(i => i + 1)
    }
  }

  async function redeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      await api.post(`/giveaway/${id}`)
      setRedeemed(true)
    } catch {
      setRedeemError('Redemption failed. Try again.')
    } finally {
      setRedeeming(false)
    }
  }

  function renderTrial(trial: TrialData) {
    if (trial.type === 'typing') {
      return <TypingTrial phrase={(trial.data as TypingTrialData).phrase} onSuccess={advanceTrial} />
    }
    if (trial.type === 'math') {
      return <MathTrialPlayer data={trial.data as MathTrialData} onSuccess={advanceTrial} />
    }
    return <PuzzleTrialPlayer data={trial.data as PuzzleTrialData} onSuccess={advanceTrial} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">{fetchError}</p>
      </div>
    )
  }

  if (!giveaway) return null

  const currentTrial = giveaway.trials?.[trialIndex]
  const trialCount = giveaway.trials?.length ?? 0
  const showRedeem = active && trialsComplete && !redeemed

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dino Giveaway
          </p>
          <h1 className="text-2xl font-bold text-foreground">{giveaway.dino.name}</h1>
          <p className="text-muted-foreground mt-1">{giveaway.dino.growthLabel}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 items-center text-center">
          {redeemed ? (
            <p className="text-sm font-medium" style={{ color: 'var(--color-success, #22c55e)' }}>
              {giveaway.completionStatus !== 'not_processed' && !redeemError
                ? 'This giveaway has already been claimed.'
                : 'Claimed! The dino is on its way.'}
            </p>
          ) : (
            <>
              {giveaway.activeAt && !active && (
                <CountdownTimer activeAt={giveaway.activeAt} onActive={handleActive} />
              )}

              {active && currentTrial && !trialsComplete && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Trial {trialIndex + 1} of {trialCount}
                  </p>
                  {renderTrial(currentTrial)}
                </div>
              )}

              {showRedeem && (
                <Button
                  onClick={redeem}
                  disabled={redeeming}
                  variant="success"
                  size="lg"
                  className="px-8"
                >
                  {redeeming ? 'Sending…' : '🎁 Redeem'}
                </Button>
              )}

              {redeemError && (
                <p className="text-destructive text-sm">{redeemError}</p>
              )}
            </>
          )}

          {shareUrl && (
            <div className="border-t border-border pt-4 w-full">
              <p className="text-xs text-muted-foreground mb-1">Share this link</p>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="font-mono text-xs break-all text-muted-foreground hover:text-primary transition-colors"
                title="Click to copy"
              >
                {shareUrl}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/giveaway/[id]/page.tsx
git commit -m "feat: giveaway claiming page with multi-trial sequence"
```

---

## Task 15: `PusherProvider` + final layout wiring

**Files:**
- Create: `components/PusherProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/PusherProvider.tsx`**

```tsx
// components/PusherProvider.tsx
'use client'
import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import api from '@/lib/api'
import { getAuthUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { moveAndGift } from '@/lib/redeem'
import type { DinoData } from '@/lib/types'

interface GiftDinoPayload {
  giveawayId: string
  dino: DinoData
  recipientApiId: string
}

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const pusherRef = useRef<Pusher | null>(null)

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
      await moveAndGift(
        session,
        parseInt(payload.dino.id, 10),
        payload.dino.name,
        payload.recipientApiId,
      )
    })

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 2: Update `app/layout.tsx` to add `PusherProvider`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { PusherProvider } from "@/components/PusherProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dino Gifter',
  description: 'Manage and gift your Age of Dino dinosaurs',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthGuard>
          <PusherProvider>
            {children}
          </PusherProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/PusherProvider.tsx app/layout.tsx
git commit -m "feat: PusherProvider subscribes to private channel and handles gift_dino event"
```

---

## Done

All 15 tasks complete. The app now has:
- Working login/register with JWT decode → localStorage user data
- Role-based home page (Regular: apiId + claimed giveaways; Operator/Admin: Giveaways + Inventory tabs)
- Giveaway creation with typing/math/puzzle trial configurator
- Giveaway claiming with per-trial sequence rendering
- Pusher real-time channel triggering `moveAndGift` on `gift_dino`

**Verify end-to-end** by ensuring the 6 backend changes in the Pre-flight section are deployed, then:
1. Register a new user → should auto-login and land on home page
2. Log in as Operator → create a giveaway with a math trial → copy the generated link
3. Open the link in another browser session as a Regular user → solve the trial → click Redeem
4. Confirm the Operator's browser receives the `gift_dino` Pusher event and `moveAndGift` fires
