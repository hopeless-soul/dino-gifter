'use client'

import { Pacifico } from 'next/font/google'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { Badge } from '@/components/ui/badge'

const pacifico = Pacifico({ weight: '400', subsets: ['latin'] })

export function Navbar() {
  const { user, logout } = useAuthUser()
  const router = useRouter()

  return (
    <header className="border-b border-border px-4 py-3 flex items-center gap-4 fixed top-0 left-0 right-0 z-50">
      <Link href="/"><h1 className={`text-base text-foreground ${pacifico.className}`}>Dino Gifter</h1></Link>
      <nav className="flex gap-4 text-sm ml-auto items-center">
        {user ? (
          <>
            <Badge>{user.username}</Badge>
            <button
              onClick={async () => { await logout(); router.replace('/login') }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">Register</Link>
          </>
        )}
      </nav>
    </header>
  )
}
