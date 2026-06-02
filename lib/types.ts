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
