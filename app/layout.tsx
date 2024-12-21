'use client'

import './globals.css'
import { useState, useEffect, useCallback } from 'react'
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
import { AnimatePresence, motion } from 'framer-motion'
import router from 'next/router'

// Peta judul halaman berdasarkan path
const pageTitles: Record<string, string> = {
  '/home': 'Home',
  '/dashboard': 'Dashboard',
  '/ticket-log': 'Ticket Log', // Judul untuk halaman Ticket Log
  '/my-inbox': 'My Inbox',
  '/admin/upload-tickets': 'Upload Tickets',
  // Tambahkan path lainnya di sini
}



export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const pathname = usePathname()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.loggedInUsers && data.loggedInUsers.length > 0) {
          const loggedInUser = data.loggedInUsers[0];
          setCurrentUser(loggedInUser);
          localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
        }
      } else if (response.status === 401) {
        console.warn('Session expired or unauthorized.');
        handleAutoLogout();
      } else {
        console.error('Failed to fetch user with unexpected status:', response.status);
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
    }
  };
  
  const handleAutoLogout = useCallback(async () => {
    try {
      await fetch('/api/updateUserStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, isWorking: false }),
      });

      // Perform logout
      await fetch('/api/logout', {
        method: 'POST',
      });

      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been logged out due to inactivity.',
        duration: 3000,
      });
      router.push('/login');
    } catch (error) {
      console.error('Error during auto logout:', error);
    }
  }, [currentUser, router, toast]);

  useEffect(() => {
    const pageTitle = pageTitles[pathname ?? ''] || 'New Xaena';
    document.title = pageTitle;
  }, [pathname]);

  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        console.log('User inactive for 30 minutes. Logging out...');
        handleAutoLogout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    resetTimer(); // Start the timer initially

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [handleAutoLogout]);

  useEffect(() => {
    const checkCurrentUser = () => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      } else {
        fetchCurrentUser();
      }
    };

    checkCurrentUser();
  }, [pathname]);

  if (!currentUser) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <main className="flex-1 p-6 bg-background text-foreground">
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen bg-background text-foreground">
            <div className="flex flex-1 overflow-hidden">
              <TooltipProvider>
                <aside
                  className={cn(
                    "bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] flex flex-col justify-between transition-all duration-300 fixed top-0 left-0 h-screen shadow-md",
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
                      <NavItem href="/home" icon={Home} label="Home" isOpen={isSidebarOpen} isActive={pathname === '/home'} />
                      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} isActive={pathname === '/dashboard'} />
                      <NavItem href="/my-inbox" icon={Ticket} label="My Inbox" isOpen={isSidebarOpen} isActive={pathname === '/my-inbox'} />
                      <NavItem href="/admin/upload-tickets" icon={Users} label="Upload Tickets" isOpen={isSidebarOpen} isActive={pathname === '/admin/upload-tickets'} />
                      <NavItem href="/ticket-log" icon={Ticket} label="Ticket Log" isOpen={isSidebarOpen} isActive={pathname === '/ticket-log'} />
                    </nav>
                  </ScrollArea>

                  <div className="p-4">
                    <ProfileMenu userId={currentUser} isOpen={isSidebarOpen} />
                  </div>
                </aside>
              </TooltipProvider>

              <main className={cn(
                "flex-1 flex flex-col overflow-hidden transition-all duration-300 bg-background pb-8",
                isSidebarOpen ? "ml-64" : "ml-20"
              )}>
                <div className="flex justify-end p-4">
                  <ThemeToggle />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    className="flex-1 overflow-auto p-6 bg-background"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn(
      "fixed bottom-2 right-2 text-xs text-muted-foreground",
      className
    )}>
      <p>Created by Bambang Nurdiansyah</p>
    </footer>
  );
}

function NavItem({ href, icon: Icon, label, isOpen, isActive }: { href: string; icon: React.ElementType; label: string; isOpen: boolean; isActive: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start transition-all duration-200 hover:bg-primary hover:text-primary-foreground",
            isOpen ? "px-3" : "px-0",
            isActive && "nav-item-active"
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
      // Reset `isWorking` status to `false`
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        await fetch('/api/updateUserStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: JSON.parse(currentUser), isWorking: false }),
        });
      }
  
      // Perform logout
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

