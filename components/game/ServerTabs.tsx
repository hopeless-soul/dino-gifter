'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SERVERS = [
  { id: '1', label: 'Survival 1' },
  { id: '2', label: 'Survival 2' },
  { id: '3', label: 'Chill' },
]

interface Props {
  active: string
  onChange: (server: string) => void
}

export function ServerTabs({ active, onChange }: Props) {
  return (
    <Tabs value={active} onValueChange={onChange}>
      <TabsList className="rounded-none bg-transparent w-full justify-start">
        {SERVERS.map(s => (
          <TabsTrigger key={s.id} value={s.id}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
