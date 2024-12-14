'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import { toast, useToast } from "@/components/ui/use-toast"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const pathname = usePathname()

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
          </ThemeProvider>
        </body>
      </html>
    );
  }  

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen">
            <div className="flex flex-1 overflow-hidden">
              <TooltipProvider>
                <aside
                  className={cn(
                    "bg-secondary text-secondary-foreground flex flex-col justify-between transition-all duration-300 fixed top-0 left-0 h-screen",
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
                      <NavItem href="/admin/upload-tickets" icon={Users} label="Upload Tickets" isOpen={isSidebarOpen} />
                      <NavItem href="/ticket-log" icon={Ticket} label="Ticket Log" isOpen={isSidebarOpen} />
                    </nav>
                  </ScrollArea>

                  <div className="p-4">
                    <ProfileMenu userId={currentUser} isOpen={isSidebarOpen} />
                  </div>
                </aside>
              </TooltipProvider>

              <main className={cn(
                "flex-1 flex flex-col overflow-hidden transition-all duration-300",
                isSidebarOpen ? "ml-64" : "ml-20"
              )}>
                <div className="flex justify-end p-4">
                  <ThemeToggle />
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </div>
              </main>
            </div>
            <Footer className={cn(
              "bg-secondary text-secondary-foreground text-center py-4 transition-all duration-300",
              isSidebarOpen ? "ml-64" : "ml-20"
            )} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

function Footer({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <p>Created by Bambang Nurdiansyah</p>
    </footer>
  );
}

function NavItem({ href, icon: Icon, label, isOpen }: { href: string; icon: React.ElementType; label: string; isOpen: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start transition-all duration-200 hover:bg-primary hover:text-primary-foreground",
            isOpen ? "px-3" : "px-0"
          )} 
          asChild
        >
          <a href={href} className="flex items-center py-2 rounded-lg">
            <Icon className={cn("w-5 h-5", isOpen ? "mr-3" : "mx-auto")} />
            {isOpen && <span>{label}</span>}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className={isOpen ? 'hidden' : ''}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ProfileMenu({ userId, isOpen }: { userId: string; isOpen: boolean }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
  
      if (response.ok) {
        localStorage.removeItem('currentUser');
        router.push('/login');
        toast({
          title: 'Logged out',
          description: 'You have been successfully logged out.',
          duration: 3000,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Logout failed. Please try again.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        duration: 3000,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn(
          "w-full justify-start p-0 transition-all duration-300",
          isOpen ? "" : "px-0"
        )}>
          <div className={cn(
            "flex items-center space-x-3",
            isOpen ? "" : "justify-center"
          )}>
            <Avatar className="w-10 h-10">
              <AvatarImage src="/profile.png" alt="Profile" />
              <AvatarFallback>{userId.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="text-left">
                <p className="font-medium">User ID: {userId}</p>
                <p className="text-xs text-muted-foreground">View profile</p>
              </div>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">User ID: {userId}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Lock className="mr-2 h-4 w-4" />
          <span>Change Password</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Shield className="mr-2 h-4 w-4" />
          <span>Activate 2FA</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
