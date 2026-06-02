'use client'
import { useRouter } from 'next/navigation'
import type { InventoryItem } from '@/lib/types'

interface Props {
  items: InventoryItem[]
}

export function InventoryPanel({ items }: Props) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-6 px-4 text-center">Inventory is empty.</p>
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
          className="relative group border border-gray-200 rounded-lg p-3 text-sm bg-white hover:border-blue-300 transition-colors cursor-pointer"
        >
          <p className="font-medium truncate leading-snug text-gray-800">{item.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{item.growthLabel}</p>
          {item.onCooldown && (
            <span className="text-xs text-red-500 block mt-0.5">Cooldown</span>
          )}
          <button
            onClick={() => giftItem(item)}
            className="absolute inset-0 w-full h-full rounded-lg bg-blue-600/90 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            Gift
          </button>
        </div>
      ))}
    </div>
  )
}
