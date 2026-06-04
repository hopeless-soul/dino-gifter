import { cn } from '@/lib/utils'
import type { SlotCard, Giveaway } from '@/lib/types'

type SlotState = 'empty' | 'active-giveaway' | 'scheduled-giveaway' | 'busy'

function getSlotState(slot: SlotCard, server: string, giveaways: Giveaway[]): SlotState {
  const giveaway = giveaways.find(
    g =>
      g.server === server &&
      g.slot === String(slot.slotNumber) &&
      g.completionStatus === 'not_processed' &&
      !g.isCanceled
  )
  if (giveaway) {
    const scheduled = giveaway.activeAt && new Date(giveaway.activeAt) > new Date()
    return scheduled ? 'scheduled-giveaway' : 'active-giveaway'
  }
  if (slot.isEmpty) return 'empty'
  return 'busy'
}

function formatTimeUntil(activeAt: string): string {
  const ms = new Date(activeAt).getTime() - Date.now()
  if (ms <= 0) return '0:00'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

interface Props {
  slots: SlotCard[]
  server?: string
  giveaways?: Giveaway[]
}

export function SlotsGrid({ slots, server = '1', giveaways = [] }: Props) {
  if (slots.length === 0) {
    return <p className="text-muted-foreground text-sm py-6 px-4 text-center">No slots found.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
      {slots.map(slot => {
        const state = getSlotState(slot, server, giveaways)
        const relatedGiveaway = giveaways.find(
          g => g.server === server && g.slot === String(slot.slotNumber) && g.completionStatus === 'not_processed'
        )
        return (
          <div
            key={slot.slotNumber}
            className={cn(
              'border rounded-lg p-3 text-sm',
              state === 'empty' && 'border-dashed border-border/50 text-muted-foreground bg-muted/20',
              state === 'active-giveaway' && 'border-purple-900/40 bg-purple-950/20 text-purple-300',
              state === 'scheduled-giveaway' && 'border-dashed border-purple-900/30 bg-purple-950/10 text-purple-400/60',
              state === 'busy' && 'border-border bg-card opacity-50 cursor-not-allowed',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Slot {slot.slotNumber}</p>
            {slot.isEmpty ? (
              <p className="italic text-xs">Empty</p>
            ) : (
              <>
                <p className="font-medium truncate">{slot.name}</p>
                <p className="text-xs mt-0.5 opacity-70">{slot.growthLabel}</p>
              </>
            )}
            {state === 'active-giveaway' && (
              <p className="text-xs mt-1 opacity-70">↑ active giveaway</p>
            )}
            {state === 'scheduled-giveaway' && relatedGiveaway?.activeAt && (
              <p className="text-xs mt-1 opacity-70">⏳ starts in {formatTimeUntil(relatedGiveaway.activeAt)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
