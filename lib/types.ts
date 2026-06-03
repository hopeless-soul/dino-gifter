// lib/types.ts

// ── Auth ──────────────────────────────────────────────────────────────────────

export type Role = 'Regular' | 'Operator' | 'Admin'

export interface AuthUser {
  id: string
  username: string
  role: Role
}

export interface JwtPayload {
  sub: string
  username: string
  role: Role
  tokenVersion: number
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
