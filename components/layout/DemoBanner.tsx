'use client'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { disableDemo } from '@/lib/demo/mode'

export function DemoBanner({ expiresAt }: { expiresAt?: number }) {
  const until = expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <div className="w-full max-w-5xl mx-auto mb-4 px-16">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4 text-left">
        <TriangleAlert size={16} className="text-yellow-500 shrink-0" />
        <p className="flex-1 text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Demo mode.</strong> You are using sample data stored in this browser. Nothing here is real and no
          gifts are sent{until && <>; everything is erased at {until}</>}.
        </p>
        <Button asChild size="sm" variant="ghost"><Link href="/demo">Demo settings</Link></Button>
        <Button size="sm" variant="outline" onClick={disableDemo}>Exit demo</Button>
      </div>
    </div>
  )
}
