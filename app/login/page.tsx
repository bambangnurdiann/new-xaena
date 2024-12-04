'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    const result = await login(formData)

    if (result.success) {
      const sessionToken = result.sessionToken
      document.cookie = `session_token=${sessionToken}; path=/;`

      try {
        const userResponse = await fetch('/api/checkLoggedInUsers')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          localStorage.setItem('currentUser', JSON.stringify(userData.loggedInUsers[0]))

          if (userData.loggedInUsers[0] === '96312') {
            router.push('/admin/upload-tickets')
          } else {
            router.push('/dashboard')
          }
        } else {
          throw new Error('Failed to fetch user data')
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError('An error occurred while fetching user data')
      }
    } else if (result.error) {
      setError(result.error || 'An unknown error occurred')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Login form */}
      <div className="w-1/2 flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to New Xaena</h1>
            <p className="mt-2 text-lg text-muted-foreground">Escalation monitoring system</p>
          </div>
          
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" placeholder="Enter your username" required />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" placeholder="Enter your password" required />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">Login</Button>
              </CardFooter>
            </form>
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          </Card>
        </div>
      </div>

      {/* Right side - Decorative section */}
      <div className="w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-primary">
          {/* Decorative shapes */}
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary-foreground/10"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-primary-foreground/20"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Monitor Your Escalations</h2>
            <p className="text-xl opacity-90">Track and manage all your escalations in one place</p>
          </div>
        </div>
      </div>
    </div>
  )
}