'use client'

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
    <div className="flex border-b border-gray-200">
      {SERVERS.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            active === s.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
