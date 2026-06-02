'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  onConnect: () => void
  loading?: boolean
  error?: string | null
}

export function SessionInput({ value, onChange, onConnect, loading, error }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white border-b border-gray-200">
      <div className="flex gap-2 max-w-2xl">
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value.trim() && onConnect()}
          placeholder="Paste your UserSession cookie…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onConnect}
          disabled={!value.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap text-sm font-medium"
        >
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
