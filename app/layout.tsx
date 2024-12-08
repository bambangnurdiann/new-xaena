'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, LayoutDashboard, Ticket, Users, LogOut, Lock, Shield, User, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

function NavItem({ href, icon: Icon, label, isOpen }: { href: string; icon: any; label: string; isOpen: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={href}
            className={cn(
              "flex items-center p-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
              isOpen ? "justify-start" : "justify-center"
            )}
          >
            <Icon className="w-5 h-5" />
            {isOpen && <span className="ml-3">{label}</span>}
          </a>
        </TooltipTrigger>
        {!isOpen && <TooltipContent>{label}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  )
}

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
          router.push('/login') // Redirect if not authenticated
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      setCurrentUser(null)
      localStorage.removeItem('currentUser')
      router.push('/login') // Redirect if error
    }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    } else {
      fetchCurrentUser()
    }
  }, [pathname])

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
                  <NavItem href="/home" icon={Home} label="Home" isOpen={isSidebarOpen} />
                  <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} />
                  <NavItem href="/tickets" icon={Ticket} label="Tickets" isOpen={isSidebarOpen} />
                  <NavItem href="/users" icon={Users} label="Users" isOpen={isSidebarOpen} />
                </nav>
              </ScrollArea>
              <div className="p-4">
                <NavItem href="/settings" icon={Lock} label="Settings" isOpen={isSidebarOpen} />
                <NavItem href="/logout" icon={LogOut} label="Logout" isOpen={isSidebarOpen} />
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
