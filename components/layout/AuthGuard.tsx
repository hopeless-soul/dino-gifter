'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAuthUser } from '@/lib/backend/auth'

const PUBLIC_PATHS = ['/login', '/register']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!PUBLIC_PATHS.includes(pathname) && !getAuthUser()) {
      router.replace('/login')
    }
  }, [pathname, router])

  return <>{children}</>
}
