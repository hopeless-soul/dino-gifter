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


export default function RegisterPage() {
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
      await api.post('/auth/register', { username, password })
      const { data } = await api.post<{ access_token: string }>('/auth/login', { username, password })
      const payload = jwtDecode<JwtPayload>(data.access_token)
      setAuthUser({ id: payload.sub, username: payload.username, role: payload.role, token: data.access_token })
      router.push('/')
    } catch {
      setError('Registration failed. Username may already be taken.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className={cn("flex flex-col gap-6", 'w-full max-w-sm')}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Register</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Creating account…' : 'Create account'}
                  </Button>
                  <FieldDescription className="text-sm text-center text-muted-foreground">
                    Already have an account?{' '}
                    <a href="/login" className="text-primary hover:underline">Login</a>
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
