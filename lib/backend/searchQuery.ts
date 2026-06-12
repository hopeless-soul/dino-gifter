// lib/backend/searchQuery.ts
const KEY = 'dino_user_search_username'

export function loadSearchQuery(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(KEY) ?? ''
}

export function saveSearchQuery(value: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, value)
}
