# Dino Gifter — Design Spec
**Date:** 2026-06-02
**Status:** Approved

## Overview

A Next.js 16 (App Router) web tool for managing dinosaur gifting on ageofdino.ru. The core flow: a giver browses their inventory, configures a giveaway (with an optional timed typing trial), shares a generated link, and a recipient redeems it — triggering the actual in-game Gift API call on the giver's behalf.

Auth is session-cookie based: the giver pastes their `UserSession` cookie into a text input. No OAuth, no server-side login yet. Login/Register pages are scaffolded as drafts.

Persistence is mocked with a module-level `Map` for now. When a real backend is added, only `lib/mock-store.ts` changes.

---

## Pages

| Route | Name | Description |
|---|---|---|
| `/` | Inventory | Live inventory + server slot viewer. Entry point for creating giveaways. |
| `/giveaway/new` | Giveaway Configurator | Form to configure a giveaway and generate a shareable link. |
| `/giveaway/[id]` | Giveaway | Recipient-facing page. Countdown, trial, and Redeem button. |
| `/login` | Login | Draft scaffold — static form, no wiring. |
| `/register` | Register | Draft scaffold — static form, no wiring. |

---

## Page 1: Inventory (`/`)

### Session input
Top bar with a text input for the `UserSession` cookie value and a "Connect" button. The rest of the page is locked (loading skeleton or disabled state) until the cookie is provided and the first `/api/slots` call succeeds.

### Inventory list
Grid of all cold-storage inventory items parsed from `/slots.php`. Each card displays dino name and growth label. On hover, a "Gift" button appears. Clicking it navigates to `/giveaway/new?invId=<id>&name=<encoded-name>&growth=<encoded-growth>`.

### Server slots
Three server sections displayed simultaneously — Survival 1, Survival 2, Chill (server IDs 1, 2, 3). Evrima (server 4) is excluded. Each section shows all slots for that server (occupied and empty). Slots are read-only display; no actions here.

All three servers are fetched in parallel on page load: three concurrent `GET /api/slots?server=N` calls. Inventory data is extracted from the first response (it is identical across all servers).

---

## Page 2: Giveaway Configurator (`/giveaway/new`)

When navigated to from the inventory page, the Item field is pre-filled via query params (`invId`, `name`, `growth`). The user can also navigate here directly and pick from a dropdown of live inventory items.

### Fields
- **Active at** — datetime-local input. Before this time, the giveaway link is accessible but the trial and Redeem button are hidden behind a countdown. Setting this to the past or leaving it empty means the giveaway is immediately active.
- **Item (Dino)** — dropdown populated from live inventory. Shows `name + growthLabel`. Stores `invId` as the value. Pre-filled if navigated from inventory page.
- **Trial** — optional toggle. When enabled:
  - Trial type: "Typing trial" (only option for now — no selector needed, just shown as a label).
  - **Phrase** — text input. Recipient must type this exactly to unlock the Redeem button.
- **Confirm** — submits `POST /api/giveaways`. On success, navigates to `/giveaway/[id]` and displays the full shareable URL prominently.

### Session requirement
This page also needs the session cookie (to populate the Item dropdown). If not set, redirect to `/` or show the session input inline.

---

## Page 3: Giveaway (`/giveaway/[id]`)

Recipient-facing. No session cookie required from the recipient.

Data is fetched via `GET /api/giveaways/[id]`. The response includes only public-safe fields — the giver's session cookie is never returned to the client.

### States

**Before active time:**
- Dino name + growth label
- Countdown timer in `HH:MM:SS` format, counting down to `activeAt`
- No trial UI visible yet
- No Redeem button

**After active time, trial not yet completed (or no trial):**
- Dino name + growth label
- If typing trial: text input with "Submit" button. Incorrect phrase → shake/error state. Correct phrase → reveals Redeem button.
- If no trial: Redeem button visible immediately.

**Redeem button clicked:**
- Loading state on button
- `POST /api/giveaways/[id]/redeem`
- Success: "Sent! Check your in-game mailbox." Button disabled.
- Error: error message from API displayed inline.

**Already redeemed:**
- "This giveaway has already been claimed."

---

## Page 4 & 5: Login + Register

Static HTML form scaffolds at `/login` and `/register`. No form submission wiring. Marked visually as "coming soon" or similar placeholder.

---

## Data Model

```ts
// lib/types.ts

interface SlotCard {
  slotNumber: number
  isEmpty: boolean
  characterClass: string   // e.g. "SuchoAdultS"
  name: string             // Russian display name
  growthLabel: string      // e.g. "адолт 1.0"
  growth: number           // e.g. 1.0
  health: number
}

interface InventoryItem {
  id: number               // data-inv attribute — used as num in ajax_inv_to_slot
  name: string             // data-name attribute
  growthLabel: string
  onCooldown: boolean      // true when inv_chill element has color:red
}

interface GiveawayConfig {
  id: string               // nanoid
  invId: number
  dinoName: string
  growthLabel: string
  activeAt: string | null  // ISO string, null = immediately active
  trial: TypingTrial | null
  session: string          // giver's UserSession cookie — server-side only, never sent to client
  recipientFriendId: string
  createdAt: string        // ISO string
  redeemed: boolean
}

interface TypingTrial {
  type: 'typing'
  phrase: string
}

interface Friend {
  id: string
  name: string
}
```

---

## Friends List (Hardcoded)

```ts
// lib/friends.ts
export const FRIENDS: Friend[] = [
  { id: "24556", name: "PlayerName" },  // edit as needed
]
```

The recipient of any giveaway redemption is always `FRIENDS[0]` for now.

---

## API Routes

All route handlers are in `app/api/`. The giver's session cookie is passed from the client via an `x-user-session` custom header (for GET requests) or in the JSON request body (for POST requests). It is never stored in the browser's cookie jar for `ageofdino.ru`.

### `GET /api/slots?server=N`
- Reads session from `x-user-session` header.
- Fetches `https://ageofdino.ru/slots.php` with `Cookie: UserSession=<value>`.
- Parses HTML with `cheerio` into `{ slots: SlotCard[], inventory: InventoryItem[] }`.
- Returns JSON.

### `POST /api/giveaways`
Request body:
```ts
{ session: string, invId: number, dinoName: string, growthLabel: string,
  activeAt: string | null, trial: TypingTrial | null }
```
- Creates a `GiveawayConfig` in the mock store with `recipientFriendId = FRIENDS[0].id`.
- Returns `{ id: string }`.

### `GET /api/giveaways/[id]`
- Looks up giveaway in mock store.
- Returns public-safe fields: `{ id, dinoName, growthLabel, activeAt, trial, redeemed }`.
- Returns 404 if not found.

### `POST /api/giveaways/[id]/redeem`
No body required from the client.
1. Look up giveaway — return 404 if not found, 409 if already redeemed, 403 if `activeAt` is in the future.
2. Move dino from inventory to an available slot: `POST ajax_inv_to_slot.php { server: "1", num: invId }`. If response is "пустой слот не найден", retry with server 2, then server 3. Return 503 if all servers are full.
3. Re-fetch `/slots.php` on the successful server. Find the slot containing a dino matching `dinoName` that did not appear in the pre-move state. (Since we can't guarantee uniqueness, pick the first match.)
4. Call `ajax_changedino.php { server, mode: "Gift", num: slotNumber, FriendID: recipientFriendId }`.
5. Mark giveaway as redeemed in mock store.
6. Return `{ ok: true }` or `{ ok: false, error: string }`.

---

## Mock Store

```ts
// lib/mock-store.ts
// Module-level Map persists across requests within a single dev server process.
// Replace the three exported functions with DB calls when a real backend is added.

const giveaways = new Map<string, GiveawayConfig>()

export function createGiveaway(config: Omit<GiveawayConfig, 'id' | 'createdAt' | 'redeemed'>): string
export function getGiveaway(id: string): GiveawayConfig | undefined
export function markRedeemed(id: string): void
```

---

## File Structure

```
app/
  page.tsx                         ← Inventory page ('use client')
  login/page.tsx                   ← Login draft
  register/page.tsx                ← Register draft
  giveaway/
    new/page.tsx                   ← Giveaway Configurator ('use client')
    [id]/page.tsx                  ← Giveaway recipient page ('use client')
  api/
    slots/route.ts                 ← GET /api/slots?server=N
    giveaways/
      route.ts                     ← POST /api/giveaways
      [id]/
        route.ts                   ← GET /api/giveaways/[id]
        redeem/route.ts            ← POST /api/giveaways/[id]/redeem

lib/
  types.ts                         ← Shared TypeScript types
  friends.ts                       ← Hardcoded FRIENDS array
  mock-store.ts                    ← In-memory giveaway store
  ageofdino.ts                     ← Raw HTTP call functions (fetchSlots, moveToSlot, sendGift)
  parse-slots.ts                   ← cheerio HTML → { slots, inventory }

components/
  SessionInput.tsx                 ← Cookie paste input + Connect button
  ServerTabs.tsx                   ← 3 server tab buttons
  InventoryPanel.tsx               ← Inventory item grid with hover Gift button
  SlotsGrid.tsx                    ← Read-only slot cards for one server
  CountdownTimer.tsx               ← HH:MM:SS live countdown
  TypingTrial.tsx                  ← Phrase input + submit + error state
```

---

## Dependencies to Add

- `cheerio` — server-side HTML parsing in route handlers
- `nanoid` — giveaway ID generation

---

## Constraints and Known Limitations

- **Slot matching on redeem:** After moving a dino from inventory to a slot, the system re-fetches slots and matches by dino name. If multiple identical dinos exist on the same server, the wrong one could be gifted. This is acceptable for now.
- **Mock store resets on server restart.** Generated giveaway links stop working after a dev server restart. Expected behavior until a real DB is added.
- **Single recipient:** All giveaways go to `FRIENDS[0]`. Multi-recipient selection is a future feature.
- **No trial verification server-side:** The typing trial is verified client-side only (phrase comparison in the browser). A determined user could bypass it. Acceptable for now; move verification to the redeem endpoint when security matters.
