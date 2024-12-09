'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Ticket, Users, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      setCurrentUser(null);
      router.push('/login'); // Redirect ke login jika tidak ada user yang terautentikasi
    }
  }, [pathname, router]);

  if (!currentUser) {
    return null; // Tidak render apa pun jika sedang dialihkan ke halaman login
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen">
            <TooltipProvider>
              <aside
                className={cn(
                  'bg-secondary text-secondary-foreground flex flex-col justify-between transition-all duration-300',
                  isSidebarOpen ? 'w-64' : 'w-20'
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
                  <ProfileMenu userId={currentUser} />
                </div>
              </aside>
            </TooltipProvider>
            <main className="flex-1 p-6 bg-background overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

function NavItem({ href, icon: Icon, label, isOpen }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={href}
          className={cn(
            'flex items-center p-2 rounded-md transition-colors hover:bg-accent',
            isOpen ? 'justify-start' : 'justify-center'
          )}
        >
          <Icon className="h-5 w-5" />
          {isOpen && <span className="ml-3">{label}</span>}
        </a>
      </TooltipTrigger>
      {!isOpen && <TooltipContent>{label}</TooltipContent>}
    </Tooltip>
  );
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
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/login');
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
            <div className="text-left">
              <p className="font-medium">User ID: {userId}</p>
              <p className="text-xs text-muted-foreground">View profile</p>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
