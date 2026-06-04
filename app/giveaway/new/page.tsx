import { Suspense } from 'react'
import { GiveawayConfigurator } from '@/components/giveaway/GiveawayConfigurator'

export default function GiveawayNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      }
    >
      <GiveawayConfigurator />
    </Suspense>
  )
}
