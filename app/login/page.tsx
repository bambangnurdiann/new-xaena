'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from 'lucide-react'
import { login } from './actions'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        if (data.isAuthenticated) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      }
    }
    checkAuth()
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    try {
      const result = await login(formData)

      if (result.success) {
        toast({
          title: "Login Successful",
          description: "You have been successfully logged in.",
          variant: "default",
        })
        router.push('/dashboard')
      } else {
        toast({
          title: "Login Failed",
          description: result.error || 'Invalid username or password',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error during login:", error)
      toast({
        title: "Error",
        description: 'An error occurred while logging in. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </CardFooter>
            </form>
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

