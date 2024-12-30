'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PerformanceChart } from './PerformanceChart'
import { ActiveTicketsModal } from './ActiveTicketsModal'
import { AlertCircle, Download } from 'lucide-react'
import { useToast } from './ui/use-toast'

interface UserPerformance {
  username: string
  totalTickets: number
  averageTime: number
  activeTickets: number
  activeTicketDetails: Array<{
    Incident: string
    lastAssignedTime: string
    elapsedTime: number
  }>
}

export function TeamLeaderDashboard() {
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([])
  const [filteredPerformance, setFilteredPerformance] = useState<UserPerformance[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserPerformance; direction: 'ascending' | 'descending' }>({ key: 'username', direction: 'ascending' })
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchUserPerformance = useCallback(async () => {
    try {
      const response = await fetch('/api/userPerformance')
      if (!response.ok) {
        throw new Error('Failed to fetch user performance data')
      }
      const data: UserPerformance[] = await response.json()
      setUserPerformance(data)
      setFilteredPerformance(data)
    } catch (error) {
      console.error('Error fetching user performance:', error)
      toast({
        title: "Error",
        description: "Failed to fetch user performance data. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchUserPerformance()
    const intervalId = setInterval(fetchUserPerformance, 60000) // Update every minute

    return () => clearInterval(intervalId)
  }, [fetchUserPerformance])

  useEffect(() => {
    const filtered = userPerformance.filter(user =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    )
    setFilteredPerformance(filtered)
  }, [searchTerm, userPerformance])

  const handleSort = (key: keyof UserPerformance) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending'
    setSortConfig({ key, direction })
    const sorted = [...filteredPerformance].sort((a, b) => {
      if (a[key] === null || b[key] === null) return 0
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1
      return 0
    })
    setFilteredPerformance(sorted)
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/exportUserPerformance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredPerformance),
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'user_performance.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Performance Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Today Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={userPerformance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
            <Select onValueChange={(value) => handleSort(value as keyof UserPerformance)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="username">Username</SelectItem>
                <SelectItem value="totalTickets">Total Tickets</SelectItem>
                <SelectItem value="averageTime">Average Time</SelectItem>
                <SelectItem value="activeTickets">Active Tickets</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Total Tickets</TableHead>
                <TableHead>Avg. Time (minutes)</TableHead>
                <TableHead>Active Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerformance.map((user) => (
                <TableRow key={user.username}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.totalTickets}</TableCell>
                  <TableCell>{user.averageTime !== null ? user.averageTime.toFixed(2) : 'N/A'}</TableCell>
                  <TableCell>{user.activeTickets}</TableCell>
                  <TableCell>
                    <Badge variant={user.activeTickets > 0 ? "default" : "secondary"}>
                      {user.activeTickets > 0 ? "Active" : "Idle"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => setSelectedUser(user.username)}>View Active Tickets</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <ActiveTicketsModal
          user={userPerformance.find(u => u.username === selectedUser)!}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {userPerformance.map(user => {
            if ((user.averageTime !== null && user.averageTime > 120) || user.activeTickets > 5) {
              return (
                <div key={user.username} className="flex items-center space-x-2 text-red-500 mb-2">
                  <AlertCircle size={16} />
                  <span>
                    {user.username} needs attention&colon; 
                    {user.averageTime !== null && user.averageTime > 120 && ` High average time (${user.averageTime.toFixed(2)} min)`}
                    {user.averageTime !== null && user.averageTime > 120 && user.activeTickets > 5 && ' and'}
                    {user.activeTickets > 5 && ` Too many active tickets (${user.activeTickets})`}
                  </span>
                </div>
              )
            }
            return null
          })}
        </CardContent>
      </Card>
    </div>
  )
}

