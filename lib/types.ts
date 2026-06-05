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

export interface RiddleTrialData {
  riddle: string
  answer: string
}

export type TrialData =
  | { type: 'typing'; data: TypingTrialData }
  | { type: 'math'; data: MathTrialData }
  | { type: 'puzzle'; data: PuzzleTrialData }
  | { type: 'riddle'; data: RiddleTrialData }

export type CompletionStatus = 'not_processed' | 'pending' | 'processed' | 'failed'

export interface GiveawayUser {
  id: string
  username: string
  role: Role
  apiId: string | null
  isPublic: boolean
}

export interface Giveaway {
  id: string
  dino: DinoData
  activeAt: string | null
  trials: TrialData[] | null
  completionStatus: CompletionStatus
  isCanceled: boolean
  createdAt: string
  creator: Partial<GiveawayUser>
  recipient: Partial<GiveawayUser> | null
  server: string | null
  slot: string | null
}

// ── API response types ────────────────────────────────────────────────────────

export interface UserMeResponse {
  id: string
  username: string
  role: Role
  apiId: string | null
  isPublic: boolean
}



export interface GiftDinoPayload {
  giveawayId: string;
  dino: DinoData;
  recipientApiId: string;
  recipientId: string;
  server: string | null;
  slot: string | null;
}