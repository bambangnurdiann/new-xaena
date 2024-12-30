'use client';

import { useUser } from '@/app/context/userContext';
import { Button } from "@/components/ui/button";
import { Menu, Home, LayoutDashboard, Ticket, Users, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const { currentUser, logout } = useUser();

  return (
    <aside className={cn(
      "bg-secondary text-secondary-foreground flex flex-col justify-between transition-all duration-300",
      isSidebarOpen ? "w-64" : "w-20"
    )}>
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
            <NavItem href="/upload-tickets" icon={Users} label="Upload Tickets" isOpen={isSidebarOpen} />
          )}
          <NavItem href="/ticket-log" icon={Ticket} label="Ticket Log" isOpen={isSidebarOpen} />
        </nav>
      </ScrollArea>
      <div className="p-4">
        <Button variant="outline" onClick={logout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

function NavItem({ href, icon: Icon, label, isOpen }: { href: string; icon: React.ElementType; label: string; isOpen: boolean }) {
  return (
    <a href={href} className={cn("flex items-center py-2 px-3 rounded-lg hover:bg-gray-100", isOpen ? "w-full" : "justify-center")}>
      <Icon className="w-5 h-5" />
      {isOpen && <span className="ml-3">{label}</span>}
    </a>
  );
}
