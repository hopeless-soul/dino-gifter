// components/__tests__/AuthGuard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { AuthGuard } from '../AuthGuard'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/some-protected-route',
}))

beforeEach(() => {
  localStorage.clear()
  mockReplace.mockClear()
})

describe('AuthGuard', () => {
  it('redirects to /login when no auth user is present', () => {
    render(<AuthGuard><div>protected</div></AuthGuard>)
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when auth user is present', () => {
    localStorage.setItem('dino_auth_user', JSON.stringify({ id: '1', username: 'u', role: 'Regular' }))
    render(<AuthGuard><div>protected</div></AuthGuard>)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
