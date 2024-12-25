'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow, isValid } from 'date-fns'

interface Agent {
  username: string
  loginTime: string
  lastLogoutTime: string
  isWorking: boolean
  loggedIn: boolean
}

export function ActiveAgentsList() {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/active-agents')
        if (!response.ok) throw new Error('Failed to fetch agents')
        const data = await response.json()
        setAgents(data)
      } catch (error) {
        console.error('Error fetching active agents:', error)
      }
    }

    fetchAgents()
    const interval = setInterval(fetchAgents, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Invalid date'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Active Agents</span>
          <Badge variant="outline">{agents.length} Online</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No active agents
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Working Time</TableHead>
                <TableHead>Last Logout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.username}>
                  <TableCell className="font-medium">{agent.username}</TableCell>
                  <TableCell>{formatDate(agent.loginTime)}</TableCell>
                  <TableCell>{formatDate(agent.lastLogoutTime)}</TableCell>
                  <TableCell>
                  <Badge 
                      variant={agent.isWorking ? "default" : "secondary"}
                      className={agent.isWorking ? "bg-green-500 text-white" : "bg-gray-300 text-gray-800"}
                    >
                      {agent.isWorking ? 'Working' : 'Idle'}
                      </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

