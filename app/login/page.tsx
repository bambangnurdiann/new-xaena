'use client'

import { useState } from 'react'
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    try {
      const result = await login(formData)

      if (result.success) {
        const sessionToken = result.sessionToken
        document.cookie = `session_token=${sessionToken}; path=/;`

        const userResponse = await fetch('/api/checkLoggedInUsers')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          localStorage.setItem('currentUser', JSON.stringify(userData.loggedInUsers[0]))

          toast({
            title: "Login Successful",
            description: "You have been successfully logged in.",
            variant: "default", // Changed from "success" to "default"
          })

          // Arahkan semua pengguna ke menu upload-tickets
          router.push('/dashboard')
        } else {
          throw new Error('Failed to fetch user data')
        }
      } else if (result.error) {
        toast({
          title: "Login Failed",
          description: result.error || 'An unknown error occurred',
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
              <CardFooter className="flex justify-between">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
