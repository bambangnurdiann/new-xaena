'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Ticket, Users, LogOut, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // For sidebar toggling
  const [currentUser, setCurrentUser] = useState<string | null>(null) // Tracks logged-in user
  const pathname = usePathname()
  const router = useRouter()

  // Toggle sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  // Fetch current user from API or localStorage
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (response.ok) {
        const data = await response.json()
        if (data.userId) {
          setCurrentUser(data.userId) // Set user
          localStorage.setItem('currentUser', JSON.stringify(data.userId)) // Cache in localStorage
        } else {
          handleLogout() // Clear user if invalid
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      handleLogout() // Clear on error
    }
  }

  // Logout function
  const handleLogout = () => {
    setCurrentUser(null) // Clear user state
    localStorage.removeItem('currentUser') // Clear localStorage
    router.push('/login') // Redirect to login page
  }

  // Initialize current user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    } else {
      fetchCurrentUser()
    }
  }, [pathname])

  // If not logged in, show only public pages
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

  // Layout when logged in
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

                {/* Navigation */}
                <nav className="space-y-2 p-4">
                  <NavItem href="/home" icon={Home} label="Home" isOpen={isSidebarOpen} />
                  <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} />
                  <NavItem href="/tickets" icon={Ticket} label="Tickets" isOpen={isSidebarOpen} />

                  {/* Conditional Menu: Only show "Upload Ticket" for specific roles */}
                  {currentUser === '96312' && (
                    <NavItem href="/upload-ticket" icon={Users} label="Upload Ticket" isOpen={isSidebarOpen} />
                  )}
                </nav>
              </ScrollArea>

              {/* Footer: Logout */}
              <div className="p-4">
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-6 w-6" />
                </Button>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 bg-background overflow-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

// Reusable Navigation Item Component
function NavItem({ href, icon: Icon, label, isOpen }: { href: string, icon: any, label: string, isOpen: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center space-x-2 p-2 rounded-md hover:bg-secondary/10 transition",
        !isOpen && "justify-center"
      )}
    >
      <Icon className="h-6 w-6" />
      {isOpen && <span>{label}</span>}
    </a>
  )
}
