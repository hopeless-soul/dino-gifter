// GET /api/slots?server=<n>
// Returns the parsed slot list for the given server (defaults to server 1).
// Requires x-user-session header to authenticate with ageofdino.ru.

import type { NextRequest } from 'next/server'
import { fetchSlotsPage } from '@/lib/crawler/ageofdino'
import { parseSlots } from '@/lib/crawler/parse-slots'

export async function GET(request: NextRequest) {
  // Auth guard — session cookie forwarded by the client
  const session = request.headers.get('x-user-session')
  if (!session) {
    return Response.json({ error: 'Missing x-user-session header' }, { status: 401 })
  }

  const server = request.nextUrl.searchParams.get('server') ?? '1'

  try {
    // Fetch raw HTML from the game site and parse it into a typed slot list
    const html = await fetchSlotsPage(session, server)
    return Response.json(parseSlots(html))
  } catch {
    return Response.json({ error: 'Failed to fetch from ageofdino.ru' }, { status: 502 })
  }
}
