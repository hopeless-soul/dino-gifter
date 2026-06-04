'use client'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { RegularHome } from '@/components/regular/RegularHome'
import { OperatorHome } from '@/components/operator/OperatorHome'

export default function HomePage() {
  const { user } = useAuthUser()
  if (!user) return null
  return (
    <div className="flex flex-col items-center mt-16 max-h-screen text-center bg-background">
      {user.role === 'Regular' ? <RegularHome /> : <OperatorHome />}
    </div>
  )
}
