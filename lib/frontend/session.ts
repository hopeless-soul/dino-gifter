const KEY = 'dino_user_session'

export function loadSession(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(KEY) ?? ''
}

export function saveSession(value: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, value)
}
