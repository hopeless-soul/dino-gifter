export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 flex flex-col gap-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 text-center">Register</h1>
        <p className="text-sm text-gray-400 text-center">Coming soon</p>
        <div className="flex flex-col gap-3 opacity-50 pointer-events-none">
          <input
            type="text"
            placeholder="Username"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            disabled
            className="py-2 bg-blue-600 text-white rounded-lg font-medium text-sm"
          >
            Create account
          </button>
        </div>
        <p className="text-sm text-center text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  )
}
