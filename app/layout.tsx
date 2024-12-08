'use client';

import './globals.css';
import { useState } from 'react';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from '@/app/context/userContext';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <UserProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex min-h-screen">
              <TooltipProvider>
                <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
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
        </UserProvider>
      </body>
    </html>
  );
}
