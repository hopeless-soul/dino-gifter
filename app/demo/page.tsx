'use client'
import { useState } from 'react'
import { Check, FlaskConical, RotateCcw, TriangleAlert } from 'lucide-react'
import { Card,CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuthUser } from '@/lib/hooks/use-auth-user'
import { disableDemo, enableDemo, resetDemo } from '@/lib/demo/mode'

// Controls only: nothing changes until the visitor clicks.
export default function DemoPage() {
  const { user } = useAuthUser()
  const [busy, setBusy] = useState(false)
  const isDemo = !!user?.demo

  async function toggle(on: boolean) {
    setBusy(true)
    if (on) await enableDemo()
    else disableDemo()
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FlaskConical size={24} />
          </div>
          <CardTitle className="text-xl">Demo mode</CardTitle>
          <ul className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
            {[
              'Try the operator tools with sample dinos',
              'Data stays in this browser',
              'Expires after two hours',
              'Nothing touches real accounts or the game',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center justify-between rounded-lg border bg-muted/40 p-4 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${isDemo ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
              {isDemo ? 'Enabled' : 'Disabled'}
            </span>
            <Switch checked={isDemo} disabled={busy} onCheckedChange={toggle} />
          </label>
          {!isDemo && user && (
            <p className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              Enabling demo mode signs you out of {user.username}.
            </p>
          )}
          {isDemo && (
            <Button variant="outline" onClick={resetDemo} className='h-12'>
              <RotateCcw size={14} /> Reset demo
            </Button>
          )}
          <a href={isDemo ? '/' : '/login'} className="text-sm text-center text-muted-foreground hover:text-foreground hover:underline">
            {isDemo ? 'Back to the app' : 'Back to login'}
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
