import type { SlotCard } from '@/lib/types'

interface Props {
  slots: SlotCard[]
}

export function SlotsGrid({ slots }: Props) {
  if (slots.length === 0) {
    return <p className="text-gray-400 text-sm py-6 px-4 text-center">No slots found.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
      {slots.map(slot => (
        <div
          key={slot.slotNumber}
          className={`border rounded-lg p-3 text-sm ${
            slot.isEmpty
              ? 'border-dashed border-gray-300 text-gray-400 bg-gray-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <p className="text-xs text-gray-400 mb-1">Slot {slot.slotNumber}</p>
          {slot.isEmpty ? (
            <p className="italic text-xs">Empty</p>
          ) : (
            <>
              <p className="font-medium truncate">{slot.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{slot.growthLabel}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
