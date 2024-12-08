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
import { useToast } from "@/components/ui/use-toast"

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
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      setCurrentUser(null)
      localStorage.removeItem('currentUser')
      window.location.href = '/login';
    }
  }

  useEffect(() => {
    fetchCurrentUser();
  }, [pathname]);

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
            </TooltipProvider>

            <main className="flex-1 p-6 bg-background overflow-auto">
              <div className="max-w-7xl mx-auto">
                <div className="flex justify-end mb-4">
                  <ThemeToggle />
                </div>
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

function NavItem({ href, icon: Icon, label, isOpen }: { href: string; icon: React.ElementType; label: string; isOpen: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href={href} className="flex items-center py-2 px-3 rounded-lg">
            <Icon className="w-5 h-5" />
            {isOpen && <span className="ml-3">{label}</span>}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className={isOpen ? 'hidden' : ''}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ProfileMenu({ userId }: { userId: string }) {
  const router = useRouter();

const handleLogout = async () => {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      // Clear localStorage and sessionStorage
      localStorage.removeItem('currentUser');
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Force a hard refresh to the login page
      window.location.href = '/login';
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
};


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start p-0">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/profile.png" alt="Profile" />
              <AvatarFallback>{userId.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium">User ID: {userId}</p>
              <p className="text-xs text-muted-foreground">View profile</p>
            </div>
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



function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
}
```[v0-no-op-code-block-prefix][v0-additional-meta]isAttachmentQuickEdit[/v0-additional-meta]

Now, let's update the server-side logout route to ensure it properly clears the session:

```ts file="route.ts" type="code" project="route"
export const dynamic = 'force-dynamic'; // Ensure dynamic route processing


import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import clientPromise from '@/lib/mongodb'

export async function POST() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("xaena_db")
    const usersCollection = db.collection('login_user')

    const result = await usersCollection.updateOne(
      { sessionToken },
      { 
        $set: { loggedIn: false, lastLogoutTime: new Date() },
        $unset: { sessionToken: "" }
      }
    )

    if (result.modifiedCount === 1) {
      // Clear the session token cookie
      const response = NextResponse.json({ message: 'Logged out successfully' })
      response.cookies.set('session_token', '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })
      return response
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
