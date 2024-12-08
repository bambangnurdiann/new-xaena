'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function LogoutButton() {
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
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

        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        })

        // Redirect to login page
        router.push('/login');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Logout error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  };

  return (
    <Button onClick={handleLogout} variant="ghost" size="sm">
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </Button>
  );
}
