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
