'use client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import type { InventoryItem } from '@/lib/types'

interface Props {
  items: InventoryItem[]
}

export function InventoryPanel({ items }: Props) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 px-4 text-center">Inventory is empty.</p>
    )
  }

  function giftItem(item: InventoryItem) {
    router.push(
      `/giveaway/new?invId=${item.id}&name=${encodeURIComponent(item.name)}&growth=${encodeURIComponent(item.growthLabel)}`
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 max-h-72 overflow-y-auto">
      {items.map(item => (
        <div
          key={item.id}
          className="relative group border border-border rounded-lg p-3 text-sm bg-card hover:border-primary/50 transition-colors cursor-pointer"
        >
          <p className="font-medium truncate leading-snug text-card-foreground">{item.name}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{item.growthLabel}</p>
          {item.onCooldown && (
            <Badge variant="destructive" className="mt-1 text-xs">Cooldown</Badge>
          )}
          <button
            onClick={() => giftItem(item)}
            className="absolute inset-0 w-full h-full rounded-lg bg-primary/90 text-primary-foreground text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            Gift
          </button>
        </div>
      ))}
    </div>
  )
}
