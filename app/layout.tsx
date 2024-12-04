'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Ticket, Users, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { NavItem } from '@/components/NavItem'
import { ProfileMenu } from '@/components/ProfileMenu'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const pathname = usePathname()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/checkLoggedInUser')
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

  useEffect(() => {
    const checkCurrentUser = () => {
      const storedUser = localStorage.getItem('currentUser')
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser))
      } else {
        fetchCurrentUser()
      }
    }

    checkCurrentUser()
  }, [pathname])

  if (!currentUser) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="bg-background text-foreground">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <main className="flex-1 p-6 bg-background overflow-auto">
              {children}
            </main>
            <Toaster />
            <SpeedInsights />
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
                  <NavItem href="/my-inbox" icon={Ticket} label="My Inbox" isOpen={isSidebarOpen} />
                  {currentUser === '96312' && (
                    <NavItem href="/admin/upload-tickets" icon={Users} label="Upload Tickets" isOpen={isSidebarOpen} />
                  )}
                  <NavItem href="/ticket-log" icon={Ticket} label="Ticket Log" isOpen={isSidebarOpen} />
                </nav>
              </ScrollArea>

              <div className="p-4">
                <ProfileMenu userId={currentUser} />
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
          </div>
          <Toaster />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}

