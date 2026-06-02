import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Register</CardTitle>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 opacity-50 pointer-events-none">
          <Input type="text" placeholder="Username" disabled />
          <Input type="email" placeholder="Email" disabled />
          <Input type="password" placeholder="Password" disabled />
          <Button disabled className="w-full">Create account</Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:underline">
              Login
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
