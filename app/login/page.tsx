'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { setAuthUser } from '@/lib/auth'
import type { AuthUser, JwtPayload } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ access_token: string }>('/auth/login', { username, password })
      const payload = jwtDecode<JwtPayload>(data.access_token)
      setAuthUser({ id: payload.sub, username: payload.username, role: payload.role, token: data.access_token })
      router.push('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className={cn("flex flex-col gap-6", 'w-full max-w-sm')}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    value={username}
                    placeholder='username'
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    placeholder='password'
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                {error && <Field><p className="text-destructive text-sm">{error}</p></Field>}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <FieldDescription className='text-sm text-center text-muted-foreground'>
                    Don&apos;t have an account?{' '}
                    <a href="/register" className="text-primary hover:underline">Register</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
