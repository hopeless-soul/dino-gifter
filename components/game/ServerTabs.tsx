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
      <TabsList className="rounded-none bg-transparent w-full justify-start border-b border-border p-0">
        {SERVERS.map(s => (
          <TabsTrigger
            key={s.id}
            value={s.id}
            className="rounded-none px-5 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground"
          >
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
