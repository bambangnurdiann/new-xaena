'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Ticket, Users, LogOut, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (response.ok) {
        const data = await response.json()
        if (data.userId) {
          setCurrentUser(data.userId)
          localStorage.setItem('currentUser', JSON.stringify(data.userId))
        } else {
          setCurrentUser(null)
          localStorage.removeItem('currentUser')
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      setCurrentUser(null)
      localStorage.removeItem('currentUser')
    }
  }

  const logout = () => {
    setCurrentUser(null) // Clear current user
    localStorage.removeItem('currentUser') // Clear localStorage
    router.push('/login') // Redirect to login page
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    } else {
      fetchCurrentUser()
    }
  }, [pathname])

  // If not logged in, render only the children (login page or public pages)
  if (!currentUser) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="bg-background text-foreground">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <main className="flex-1 p-6 bg-background overflow-auto">
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen">
            <TooltipProvider>
              <aside
                className={cn(
                  "bg-secondary text-secondary-foreground flex flex-col justify-between transition-all duration-300",
                  isSidebarOpen ? "w-64" : "w-20"
                )}
              >
                <ScrollArea className="flex-1">
                  <div className="p-4 flex items-center justify-between">
                    {isSidebarOpen && <span className="font-bold text-lg">Dashboard</span>}
                    <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                      <Menu className="h-6 w-6" />
                    </Button>
                  </div>
                  <nav className="space-y-2 p-4">
                    <NavItem href="/home" icon={Home} label="Home" isOpen={isSidebarOpen} />
                    <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} />
                    <NavItem
                      href="/tickets/upload"
                      icon={Ticket}
                      label="Upload Ticket"
                      isOpen={isSidebarOpen}
                      show={true} // Change this logic to depend on roles if needed
                    />
                    <NavItem href="/users" icon={Users} label="Users" isOpen={isSidebarOpen} />
                  </nav>
                </ScrollArea>
                <div className="p-4">
                  <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-6 w-6" />
                  </Button>
                </div>
              </aside>
              <main className="flex-1 p-6 bg-background overflow-auto">
                <div className="max-w-7xl mx-auto">
                  <div className="flex justify-end mb-4">
                    <ThemeToggle />
                  </div>
                  {children}
                </div>
              </main>
            </TooltipProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
