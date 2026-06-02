import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSlotsPage, moveToSlot, sendGift } from '../ageofdino'

const SESSION = 'test_session_token'

beforeEach(() => { vi.restoreAllMocks() })

describe('fetchSlotsPage', () => {
  it('POSTs to ajax_server.php then GETs slots.php', async () => {
    const html = '<html>slots</html>'
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(''))
      .mockResolvedValueOnce(new Response(html))
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchSlotsPage(SESSION, '2')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('https://ageofdino.ru/ajax_server.php')
    expect(mockFetch.mock.calls[0][1].body).toBe('server=2')
    expect(mockFetch.mock.calls[1][0]).toBe('https://ageofdino.ru/slots.php')
    expect(result).toBe(html)
  })

  it('sends the UserSession cookie', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await fetchSlotsPage(SESSION, '1')

    expect(mockFetch.mock.calls[0][1].headers.Cookie).toBe(`UserSession=${SESSION}`)
  })
})

describe('moveToSlot', () => {
  it('returns ok:true when response body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')))
    expect(await moveToSlot(SESSION, '1', 337)).toEqual({ ok: true })
  })

  it('returns ok:false with Russian error text when slot not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('пустой слот не найден')))
    expect(await moveToSlot(SESSION, '1', 337)).toEqual({
      ok: false,
      error: 'пустой слот не найден',
    })
  })

  it('POSTs to ajax_inv_to_slot.php with server and num', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await moveToSlot(SESSION, '2', 337)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ageofdino.ru/ajax_inv_to_slot.php',
      expect.objectContaining({ method: 'POST', body: 'server=2&num=337' })
    )
  })
})

describe('sendGift', () => {
  it('POSTs Gift mode to ajax_changedino.php', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', mockFetch)

    await sendGift(SESSION, '2', 3, '24556')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ageofdino.ru/ajax_changedino.php',
      expect.objectContaining({
        method: 'POST',
        body: 'server=2&mode=Gift&num=3&FriendID=24556',
      })
    )
  })

  it('returns ok:true on 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')))
    expect(await sendGift(SESSION, '2', 3, '24556')).toEqual({ ok: true })
  })

  it('returns ok:false on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    expect(await sendGift(SESSION, '2', 3, '24556')).toEqual({ ok: false, error: 'HTTP 500' })
  })
})
