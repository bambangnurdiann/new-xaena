'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Ticket, UserCheck, AlertCircle, Clock } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

interface TicketStats {
  totalTickets: number;
  ticketsAssigned: number;
  ticketsLeft: number;
  ticketsInProgress: number;
  loggedInAgents: number;
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const fetchTicketStats = useCallback(async () => {
    try {
      const response = await fetch('/api/ticket-stats', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ticket stats');
      }
      
      const data = await response.json();
      setTicketStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      setError('Failed to update ticket stats');
      toast({
        title: "Error",
        description: "Failed to fetch latest ticket stats. Retrying...",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        setIsAuthenticated(data.isAuthenticated)
        if (!data.isAuthenticated) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        toast({
          title: "Authentication Error",
          description: "Please try logging in again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, toast])

  useEffect(() => {
    if (isAuthenticated) {
      fetchTicketStats();
      const pollInterval = setInterval(fetchTicketStats, 3000);
      return () => clearInterval(pollInterval);
    }
  }, [isAuthenticated, fetchTicketStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Ticket Monitoring Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Tickets"
              value={ticketStats?.totalTickets}
              icon={<Ticket className="h-4 w-4 text-blue-500" />}
              description="All tickets in the system"
            />
            <StatsCard
              title="Assigned Tickets"
              value={ticketStats?.ticketsAssigned}
              icon={<UserCheck className="h-4 w-4 text-green-500" />}
              description="Tickets currently assigned"
            />
            <StatsCard
              title="Unassigned Tickets"
              value={ticketStats?.ticketsLeft}
              icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
              description="Tickets waiting for assignment"
            />
            <StatsCard
              title="In Progress"
              value={ticketStats?.ticketsInProgress}
              icon={<Clock className="h-4 w-4 text-purple-500" />}
              description="Tickets currently being worked on"
            />
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketStats?.loggedInAgents || 0}</div>
              <p className="text-xs text-muted-foreground">Agents currently logged in and available</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function StatsCard({ title, value, icon, description }: { title: string, value?: number, icon: React.ReactNode, description: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value !== undefined ? (
          <div className="text-2xl font-bold">{value}</div>
        ) : (
          <Skeleton className="h-8 w-20" />
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
