'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/backend/api'
import type { UserMeResponse } from '@/lib/types'
import { Field, FieldDescription } from '@/components/ui/field'
import { TriangleAlert } from 'lucide-react'

export function ApiIdCard() {
  const [apiId, setApiId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<UserMeResponse>('/users/me')
      .then(({ data }) => { if (data.apiId) setApiId(data.apiId) })
      .catch(() => { })
  }, [])

  async function saveApiId() {
    setSaving(true)
    try { await api.patch('/users', { apiId }) } finally { setSaving(false) }
  }

  return (
    <Card className='w-full'>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-left" style={{color: '#bbbbbb'}}>Your API ID {!apiId && <span className='ml-1' style={{color: '#444', fontWeight: '400'}}>(unsaved)</span>}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Field>
          <Input
            value={apiId}
            onChange={e => setApiId(e.target.value)}
            placeholder="Your in-game user ID"
          />
        </Field>
        <Button onClick={saveApiId} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
