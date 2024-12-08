'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Ticket, Users, LogOut, Menu, FilePlus, List } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Sidebar toggle
  const [currentUser, setCurrentUser] = useState<string | null>(null) // Tracks current user
  const router = useRouter()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  // Fetch current user or redirect to login if not logged in
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (response.ok) {
        const data = await response.json()
        if (data.userId) {
          setCurrentUser(data.userId) // Set user
          localStorage.setItem('currentUser', JSON.stringify(data.userId)) // Cache user
        } else {
          handleLogout() // If no user, force logout
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      handleLogout()
    }
  }

  // Logout functionality
  const handleLogout = () => {
    setCurrentUser(null) // Clear current user
    localStorage.removeItem('currentUser') // Remove from storage
    router.push('/login') // Redirect to login page
  }

  // Check user state on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    } else {
      fetchCurrentUser()
    }
  }, [])

  // If no user, show login-related UI
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

  // Layout when user is logged in
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen">
            {/* Sidebar */}
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
                  {/* Main Navigation Items */}
                  <NavItem href="/home" icon={Home} label="Home" isOpen={isSidebarOpen} />
                  <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} />
                  <NavItem href="/ticket-log" icon={List} label="Ticket Log" isOpen={isSidebarOpen} />
                  <NavItem href="/upload-ticket" icon={FilePlus} label="Upload Ticket" isOpen={isSidebarOpen} />
                  <NavItem href="/users" icon={Users} label="Users" isOpen={isSidebarOpen} />
                </nav>
              </ScrollArea>
              {/* Logout Button */}
              <div className="p-4">
                <Button variant="ghost" size="lg" onClick={handleLogout}>
                  <LogOut className="mr-2 h-5 w-5" /> Logout
                </Button>
              </div>
            </aside>
            {/* Main Content */}
            <main className="flex-1 p-6 bg-background overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

// Navigation Item Component
function NavItem({ href, icon: Icon, label, isOpen }: { href: string; icon: any; label: string; isOpen: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {isOpen && <span>{label}</span>}
    </a>
  )
}
