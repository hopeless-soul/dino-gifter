# Refactor + UX Design — 2026-06-04

## Scope

Two independent goals in sequence:

1. **Structural refactor** — reorganise components, pages, and lib without changing behaviour
2. **UX improvements** — primarily the giveaway claiming page

---

## Part 1 — Structural Refactor

### Component grouping

Current flat structure becomes:

```
components/
  layout/
    Navbar.tsx
    AuthGuard.tsx
    PusherProvider.tsx
  game/
    InventoryPanel.tsx
    SlotsGrid.tsx
    ServerTabs.tsx
  giveaway/
    GiveawayConfigurator.tsx   ← moved from app/giveaway/new/configurator.tsx
    TrialConfigurator.tsx
    CountdownTimer.tsx
  trials/                      ← keep existing structure
    TypingTrialEditor.tsx
    MathTrialEditor.tsx
    PuzzleTrialEditor.tsx
    MathTrialPlayer.tsx
    PuzzleTrialPlayer.tsx
    TypingTrial.tsx             ← moved from components/TypingTrial.tsx
  user/
    ApiIdCard.tsx
    SessionInput.tsx
  ui/                          ← shadcn, unchanged
```

### Page extraction

`app/page.tsx` currently embeds `RegularHome`, `OperatorHome`, and `Countdown` as local functions. Extract:

```
components/
  regular/
    RegularHome.tsx
  operator/
    OperatorHome.tsx
```

Pages become thin wrappers that import these components.

### Lib grouping

```
lib/
  crawler/
    ageofdino.ts     ← raw HTTP calls to ageofdino.ru
    parse-slots.ts   ← HTML parsing
    redeem.ts        ← moveAndGift orchestration
  backend/
    api.ts           ← axios instance with auth interceptors
    auth.ts          ← localStorage AuthUser helpers
    session.ts       ← localStorage session helpers
  hooks/
    use-auth-user.ts
    use-session.ts
  types.ts           ← stays at lib/ root
  utils.ts           ← stays at lib/ root
```

All existing import paths must be updated to match new locations.

---

## Part 2 — DTO Fixes

Fixes to `lib/types.ts` based on OpenAPI spec comparison:

| Fix | Detail |
|---|---|
| `DinoData` — add `server` + `slot` | Backend `DinoDataDto` requires both as strings |
| `recipient` → `recipient` | Typo in `Giveaway` interface; update all usages |
| Add `UserMeResponse` type | `{ apiId: string \| null }` for `GET /users/me` |

The `GiftDinoPayload.dino.id` usage (`parseInt` as `invId`) is intentional — the frontend stores the game inventory number as the dino ID string, and the backend echoes it back.

---

## Part 3 — Giveaway Claiming Page UX (`/giveaway/[id]`)

### Layout

**Desktop — two columns, full height:**

```
┌─────────────────────┐  ┌────────────────────────────┐
│     Hero card       │  │                            │
│  creator · dino     │  │     Trial content card     │
│  name · server      │  │     (fills full height)    │
│  [Redeem button]    │  │                            │
│  share link         │  │                            │
├─────────────────────┤  └────────────────────────────┘
│   Status card       │
│   (fixed height)    │
└─────────────────────┘
```

**Mobile — single column, stacked:**
Hero card → Status card → Trial content card

### Hero card

- Creator name (small, muted, uppercase)
- Dino icon (gradient circle)
- Dino name (large, bold)
- Growth label · Server (muted)
- Redeem button (see states below)
- Share URL (tiny, muted, click to copy)

### Redeem button states

| Condition | Style |
|---|---|
| Countdown active or trials pending | Disabled, grey (`bg-muted`, `text-muted-foreground`, `cursor-not-allowed`) |
| No trials, or all trials complete | **Active, purple** (`bg-primary`, `text-primary-foreground`) |
| Already claimed | Dimmed purple (`bg-primary/20`, `text-primary`, `cursor-default`) |

### Status card — fixed height, no layout jump

Three content slots absolutely positioned and faded in/out. Only one visible at a time.

| Condition | Content |
|---|---|
| `activeAt` in the future | "Available in" + `HH:MM:SS` countdown |
| Trials in progress | Trial name · `N / total` counter + segmented progress bar |
| All trials done (not yet claimed) | "Done" · `N / N` + full bar + grey "Complete all trials to unlock" label |
| Claimed | Dark purple-blue gradient background, trophy icon centred, winner username, "Claimed this gift" |

### Trial content card

- Fills the full height of the right column on desktop
- Trial type label + heading
- Trial body (typing input, math expression, sudoku grid)
- Dot indicator for position within trial sequence (e.g. `○ ● ○`)
- On mobile: `min-height` to avoid collapsing

---

---

## Part 4 — Creation Page UX (`/giveaway/new`)

### Layout

Three cards in a horizontal row, stretching to equal height:

```
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  Configure       │  │  Server Slots        │  │  Trial Configurator  │
│  Giveaway        │  │  (server tabs +      │  │  (visible only when  │
│  (240px fixed)   │  │   slot grid, scroll) │  │   trials enabled)    │
│                  │  │                      │  │                      │
│  [Generate Link] │  │                      │  │  [+ Add Trial]       │
│  (pins bottom)   │  │                      │  │                      │
└──────────────────┘  └──────────────────────┘  └──────────────────────┘
```

- Config card: 240px fixed width, `flex-direction: column`, Generate Link button pinned to bottom via `margin-top: auto`
- Slots card and Trial card: `flex: 1`, internal `overflow-y: auto`
- All cards `align-items: stretch` so they share the same height

### Transitions

- **Trial card** slides in/out horizontally (`width` animated via CSS transition, `cubic-bezier(0.4,0,0.2,1)`) when "Enable Trials" is toggled. Trial entries stagger in with `opacity` + `translateY`.
- **Server tab switch** — outgoing page fades and slides in the direction of the selected tab; incoming page slides in from the opposite side.
- Toggle control uses a switch (not a checkbox) to match the animated feel.

---

## Part 5 — Operator Home UX (`/` for Operator/Admin role)

### Layout — unchanged from current

- Two cards side-by-side at top: SessionInput + ApiIdCard
- Tabs below: Giveaways | Inventory
- New Giveaway button aligned right of tab list

### Visual changes

| Element | Change |
|---|---|
| Logo font | `font-family: Pacifico, 'Pacifico Fallback'; font-style: normal; font-weight: 400;` |
| Navbar background | Same as page background (`bg-background`) |
| New Giveaway button | White (`bg-white text-black`) |
| Gift icons in list | White (`text-white`) — lucide `<Gift>` component |
| Status pills | Monochrome (grey background, grey text) for all statuses |
| Countdown in list | Always rendered; `HH:MM` format only (no seconds); shows `0:00` when expired |

### Giveaway list items

Each item preserves its existing **HoverCard** (opens on hover over the gift icon media area). The HoverCard shows: dino name, giveaway ID, trials list with badges, gift status, created date, active countdown. This must not be removed or broken during refactor.

### Inventory tab — Server Slots

Slots are cross-referenced against the active giveaway list and rendered in one of four states:

| State | Condition | Style |
|---|---|---|
| **Empty** | No dino in slot | Dashed border, dim text |
| **Active giveaway** | Slot tied to a giveaway with `completionStatus: not_processed` and `activeAt` passed (or null) | Dim purple tint, "↑ active giveaway" tag |
| **Scheduled giveaway** | Slot tied to a giveaway with `activeAt` in the future | Dashed dim purple, "⏳ starts in HH:MM" tag |
| **Busy** | Has a dino, not tied to any open giveaway | Greyed out, reduced opacity — not clickable |

---

---

## Part 6 — Regular User Home UX (`/` for Regular role)

### Layout

Single-column, max-width 480px, centred:

```
┌──────────────────────────────┐
│  Navbar (logo · username)    │
├──────────────────────────────┤
│  Your API ID card            │
│  (identical to Operator)     │
├──────────────────────────────┤
│  Claimed Giveaways           │
│  ┌────────────────────────┐  │
│  │ [Gift] T-Rex (Huge)    │  │
│  │        Ancient · from  │  │
│  │        hopeless-soul   │  │
│  │                  04/06 │↗ │
│  ├────────────────────────┤  │
│  │ [Gift] Ankylosaurus    │  │
│  │  ...                   │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### API ID card

Identical in structure and style to the operator view:
- Card with header "Your API ID", body with text input + Save button
- Same monochrome colours (`#161616` background, `#1e1e1e` borders)

### Claimed Giveaways list

Scroll area with item list matching the operator giveaway list style:

| Element | Detail |
|---|---|
| Left icon | White lucide `<Gift>` in a `36×36` dark rounded square |
| Title | Dino name (e.g. "T-Rex (Huge)") |
| Subtitle | `{growthLabel} · from {creator username}` |
| Right: date | Compact date (`DD/MM`) in monospace muted colour |
| Right: link button | `28×28` icon button with lucide `<ExternalLink>`, navigates to `/giveaway/{id}` |
| Hover | Border lightens slightly |

Empty state: italic muted "No claimed giveaways yet." centred.

---

## Out of scope

- Admin frontend pages (backend routes exist but no frontend planned in this pass)
