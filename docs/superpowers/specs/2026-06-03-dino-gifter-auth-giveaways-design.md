# Dino Gifter — Auth, Giveaways & Pusher Design

**Date:** 2026-06-03  
**Scope:** Authentication, role-based home page, giveaway creation with trials, giveaway claiming with trial sequence, real-time Pusher dino transfer.

---

## 1. Architecture

### API Layer
- Frontend calls the NestJS backend directly via axios.
- A singleton axios instance (`lib/api.ts`) is configured with `baseURL` from `NEXT_PUBLIC_API_URL` and `withCredentials: true` so the httpOnly cookie is sent on every request.
- The existing `/api/slots` Next.js route handler is kept as-is for server-side game scraping (ageofdino.ru).
- Old Next.js proxy routes (`/api/giveaways`, `/api/giveaways/[id]`, `/api/giveaways/[id]/redeem`) are deleted.

### New packages
- `axios` — replaces raw fetch for all backend calls
- `jwt-decode` — decodes the access token from the login response body
- `pusher-js` — Pusher client for real-time events

### Backend changes required (outside frontend scope but blocking)
- `giveaway.gateway.ts`: rename emitted event `move_dino` → `gift_dino`
- `giveaway.service.ts`: fix `recipientApiId: u.id` → `recipientApiId: u.apiId`
- `UsersController`: add `PATCH /users` endpoint using `@CurrentUser()` to update `apiId`
- `UsersController`: add `GET /users/me` endpoint to return `{id, username, role, apiId}` for the current user
- `GiveawayController`: add `GET /giveaway/won` (or similar) restricted to Regular users, returning giveaways where `recepient = currentUser`
- NestJS CORS: allow the frontend origin (`NEXT_PUBLIC_API_URL` origin) with credentials

---

## 2. Authentication

### Token storage (Approach B)
The backend sets an httpOnly `access_token` cookie AND returns `{access_token: string}` in the login response body. Frontend decodes the JWT from the response body once using `jwt-decode`, extracts `{sub, role, username}`, and persists only `{id: sub, role, username}` to localStorage. The raw token is never stored. The cookie handles all subsequent API authentication automatically.

### Auth utility (`lib/auth.ts`)
Three functions:
- `getAuthUser()` — reads `{id, role, username}` from localStorage; returns `null` if absent
- `setAuthUser(user)` — writes to localStorage
- `clearAuthUser()` — removes from localStorage

A `useAuthUser()` hook exposes the current user and a `logout()` function.

### Auth guard
An `AuthGuard` client component rendered in `app/layout.tsx` reads auth state on mount. If the user is unauthenticated and the current path is not `/login` or `/register`, it redirects to `/login` via `router.replace`.

### Login flow (`/login`)
1. User submits username + password form
2. POST `/auth/login` → `{access_token}`
3. Decode JWT → extract `{sub, role, username}`
4. `setAuthUser({id: sub, role, username})`
5. `router.push('/')`

### Register flow (`/register`)
1. User submits username + password form (min 8 chars)
2. POST `/auth/register` → 201
3. Auto-login: POST `/auth/login` with same credentials
4. Same steps 3–5 as login

### Logout
POST `/auth/logout` → `clearAuthUser()` → `router.replace('/login')`

---

## 3. Home Page (`/`)

Role-based, gated behind `AuthGuard`.

### Regular user view
- **API ID field**: input + Save button; on mount calls `GET /users/me` to populate current `apiId` value. On save calls `PATCH /users` with `{apiId}`.
- **Claimed giveaways list**: calls `GET /giveaway/won` (backend endpoint to be added) returning giveaways where the current user is the recipient. Displays dino name, growthLabel, and claim date. Empty state: "No claimed giveaways yet."

### Operator / Admin view
Two tabs using the existing `Tabs` Radix component:

**Giveaways tab**
- "New Giveaway" button → navigates to `/giveaway/new`
- List of giveaways created by the current user: `GET /giveaway` (Operator/Admin only endpoint). Shows dino name, growthLabel, `completionStatus` badge, created date.

**Inventory tab**
- Unchanged from the current `page.tsx` inventory/slot viewer (session input, server tabs, slots grid).

---

## 4. Giveaway Creation (`/giveaway/new`)

Operator/Admin only. Redirect Regular users to `/`.

### Single-column mode (trials disabled)
Card contains:
- **Dino selector**: dropdown populated from `/api/slots?server=1` (same as current). Stores `{id: String(item.id), name, growthLabel}` as `DinoDataDto`.
- **Active At**: optional datetime-local input.
- **Enable Trials** checkbox.
- **Generate Link** button → submits.

### Two-column mode (trials enabled)
When "Enable Trials" is checked, the layout expands to two columns:
- **Left**: the giveaway config card (same fields as above).
- **Right**: Trial Configurator card.

### Trial Configurator card
- "+" button adds a new trial entry.
- Each trial entry has:
  - A `Select` for trial type: `typing | math | puzzle`
  - Type-specific form below:
    - **Typing**: one text input — "Phrase to type exactly" → stored as `data: {phrase: string}`
    - **Math**: two inputs — "Expression" + "Answer (number)" → stored as `data: {expression: string, answer: number}`
    - **Puzzle**: a 9×9 Sudoku grid editor with two modes (toggle): "Set puzzle" (locks given cells) and "Set solution" (fills the solution). Stored as `data: {grid: number[][], solution: number[][]}` where 0 = empty cell.
  - "✕" remove button.

### Submission
POST `/giveaway` with `CreateGiveawayDto`:
```ts
{
  dino: { id: string, name: string, growthLabel: string },
  activeAt: string | null,
  trials: TrialDataDto[] | null,
}
```
On 201: navigate to `/giveaway/{id}` (where `id` comes from the response body).

---

## 5. Giveaway Claiming (`/giveaway/:id`)

Accessible to all authenticated users.

### Data fetching
On mount: `GET /giveaway/{id}` → full Giveaway entity including `trials: TrialData[] | null`, `dino`, `activeAt`, `recepient` (null if unclaimed), `isCanceled`.

### States
- **Loading** — spinner
- **Not found / canceled** — error message
- **Countdown** — if `activeAt` is in the future, show `CountdownTimer` (existing component). Trials and Redeem are hidden until active.
- **Trial sequence** — if `trials` is non-null and non-empty, display one trial at a time.
- **Redeem** — shown when active and all trials passed (or no trials).
- **Already claimed** — `recepient !== null`: show "This giveaway has already been claimed."

### Trial rendering (one at a time, tracked by `currentTrialIndex`)
- **Typing**: show required phrase in a code block, text input below. "Next" enabled only when input matches `data.phrase` exactly.
- **Math**: show `data.expression`, number input. "Next" enabled when `Number(input) === data.answer`.
- **Puzzle**: render the 9×9 grid pre-filled with `data.grid`. Claimer fills empty cells. "Next" enabled when the filled grid matches `data.solution` exactly.

### Redeem
POST `/giveaway/{id}` (claim endpoint) → 202 accepted. On success: show "Claimed! The dino is on its way." error state shows message.

---

## 6. Pusher Integration

### Setup
A `PusherProvider` component wraps the app (inside `AuthGuard`, so it only mounts when authenticated). It initializes a single `Pusher` instance:

```ts
new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  channelAuthorization: {
    customHandler: async ({ socketId, channelName }, callback) => {
      try {
        const { data } = await api.post('/pusher/auth', { socket_id: socketId, channel_name: channelName })
        callback(null, data)
      } catch (err) {
        callback(new Error('Pusher auth failed'), null)
      }
    },
  },
})
```

Using a `customHandler` (instead of the default ajax transport) ensures the axios instance's `withCredentials: true` setting is used, so the httpOnly cookie is included in the Pusher channel authorization request.

### Subscription
Subscribe to `private-user-{userId}` (where `userId = authUser.id` from localStorage).

### Event: `gift_dino`
Payload: `{giveawayId: string, dino: DinoData, recipientApiId: string}`

`recipientApiId` is `User.apiId` — the claimer's in-game ID. On receiving the event, call the existing game gift function in `lib/ageofdino.ts` with the operator's game session and `recipientApiId`.

The Pusher subscription is on the **operator's** channel — when a Regular user claims a giveaway, the backend fires `gift_dino` to the creator's channel so the creator's browser can perform the actual in-game transfer.

### Cleanup
On logout: `channel.unbind_all()`, `pusher.unsubscribe(...)`, `pusher.disconnect()`.

---

## 7. Trial Data Shapes (confirmed)

```ts
// Typing
{ type: 'typing', data: { phrase: string } }

// Math
{ type: 'math', data: { expression: string, answer: number } }

// Puzzle
{ type: 'puzzle', data: { grid: number[][], solution: number[][] } }
// grid[r][c]: 0 = empty, 1–9 = given value
```

---

## 8. File Structure Changes

### New files
- `lib/api.ts` — axios instance
- `lib/auth.ts` — auth storage utilities
- `lib/use-auth-user.ts` — auth React hook
- `components/AuthGuard.tsx` — redirect unauthenticated users
- `components/PusherProvider.tsx` — Pusher lifecycle
- `components/TrialConfigurator.tsx` — trial list editor (creation side)
- `components/trials/TypingTrialEditor.tsx`
- `components/trials/MathTrialEditor.tsx`
- `components/trials/PuzzleTrialEditor.tsx` — Sudoku grid editor (set puzzle + solution)
- `components/trials/TypingTrialPlayer.tsx`
- `components/trials/MathTrialPlayer.tsx`
- `components/trials/PuzzleTrialPlayer.tsx` — Sudoku grid (claimer fills in)
- `app/page.tsx` — rewritten as role-based home page

### Modified files
- `app/layout.tsx` — add `AuthGuard` and `PusherProvider`
- `app/login/page.tsx` — implement login form
- `app/register/page.tsx` — implement register form
- `app/giveaway/new/configurator.tsx` — rewrite for new API + trial configurator
- `app/giveaway/[id]/page.tsx` — extend to handle trial sequence

### Deleted files
- `app/api/giveaways/route.ts`
- `app/api/giveaways/[id]/route.ts`
- `app/api/giveaways/[id]/redeem/route.ts`
- `lib/friends.ts`
- `lib/redeem.ts`
- `lib/mock-store.ts` (if no longer needed)

### Unchanged
- `app/api/slots/route.ts` — game scraper stays
- All `components/ui/*` — no changes
- `lib/ageofdino.ts`, `lib/parse-slots.ts` — no changes
- `components/SessionInput.tsx`, `InventoryPanel.tsx`, `ServerTabs.tsx`, `SlotsGrid.tsx` — moved into Inventory tab only

---

## 9. Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...
```
