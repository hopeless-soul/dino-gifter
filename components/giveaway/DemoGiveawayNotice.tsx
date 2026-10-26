import { Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function DemoGiveawayNotice() {
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/10">
      <CardContent className="flex items-start gap-3 p-4">
        <Lock size={16} className="text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Demo mode. </strong>This giveaway can&apos;t be claimed. You can still try the countdown and trials.
        </p>
      </CardContent>
    </Card>
  )
}
