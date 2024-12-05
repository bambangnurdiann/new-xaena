'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface Ticket {
  _id?: string
  Incident: string
  assignedTo?: string
  lastAssignedTime?: number
  status?: string
  SID?: string
  TTR: string
  category?: string
  level?: string
}

export default function UploadTickets() {
  const [csvData, setCsvData] = useState<Ticket[]>([])
  const [existingTickets, setExistingTickets] = useState<Ticket[]>([])
  const [loggedInUsers, setLoggedInUsers] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/checkLoggedInUser')
      if (response.ok) {
        const data = await response.json()
        if (data.userId) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
          router.push('/login')
        }
      } else {
        throw new Error('Failed to check authentication')
      }
    } catch (error) {
      console.error('Error checking authentication:', error)
      setIsAuthenticated(false)
      router.push('/login')
    }
  }, [router])

  const fetchExistingTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const tickets = await response.json()
        setExistingTickets(Array.isArray(tickets) ? tickets : [])
      } else {
        throw new Error('Failed to fetch existing tickets')
      }
    } catch (error) {
      console.error('Error fetching existing tickets:', error)
      toast({
        title: "Error",
        description: "Failed to fetch existing tickets. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  const fetchLoggedInUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (response.ok) {
        const data = await response.json()
        setLoggedInUsers(data.loggedInUsers || [])
      } else {
        throw new Error('Failed to fetch logged-in users')
      }
    } catch (error) {
      console.error('Error fetching logged-in users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch logged-in users. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchAuthentication()
  }, [fetchAuthentication])

  useEffect(() => {
    if (isAuthenticated) {
      fetchExistingTickets()
      fetchLoggedInUsers()
    }
  }, [isAuthenticated, fetchExistingTickets, fetchLoggedInUsers])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const tickets = (results.data as Record<string, string | undefined>[]).map((row) => ({
            Incident: row.Incident || '',
            SID: row.SID || '',
            TTR: row.TTR || '00:00:00',
            category: row.category || '',
          })).filter((ticket) => ticket.Incident.trim() !== '')

          try {
            setIsCategorizing(true)
            const categorizedTickets = await fetchFilterCategories(tickets)
            setCsvData(categorizedTickets)
            toast({
              title: "CSV Uploaded",
              description: `${categorizedTickets.length} tickets have been uploaded and categorized.`,
            })
          } catch (error) {
            console.error('Error categorizing tickets:', error)
            toast({
              title: "Categorization Error",
              description: "There was an error categorizing the tickets.",
              variant: "destructive",
            })
          } finally {
            setIsUploading(false)
            setIsCategorizing(false)
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error)
          toast({
            title: "Upload Error",
            description: "Failed to parse CSV file.",
            variant: "destructive",
          })
          setIsUploading(false)
        },
      })
    }
  }

  const fetchFilterCategories = async (tickets: Ticket[]): Promise<Ticket[]> => {
    const response = await fetch('/api/filterCategories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickets }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch filter categories')
    }

    return await response.json()
  }

  const handleProcessTickets = async () => {
    if (csvData.length === 0) {
      toast({
        title: "No Tickets",
        description: "There are no tickets to process. Please upload a CSV file first.",
        variant: "destructive",
      })
      return
    }

    const existingIncidents = new Set(existingTickets.map(ticket => ticket.Incident))
    const newTickets = csvData.filter(ticket => !existingIncidents.has(ticket.Incident))
    const ticketsToUpdate = csvData.filter(ticket => existingIncidents.has(ticket.Incident))

    const updatedTickets = ticketsToUpdate.map(csvTicket => {
      const existingTicket = existingTickets.find(ticket => ticket.Incident === csvTicket.Incident)
      return existingTicket ? { ...existingTicket, ...csvTicket } : csvTicket
    })

    const processedTickets = [...newTickets, ...updatedTickets].map(ticket => ({
      ...ticket,
      level: assignLevelBasedOnTTR(ticket),
    }))

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketsToProcess: processedTickets }),
      })

      if (response.ok) {
        const savedTickets = await response.json()
        toast({
          title: "Tickets Processed",
          description: `${savedTickets.length} tickets have been processed and saved.`,
        })
        setExistingTickets(savedTickets)
        setCsvData([])
      } else {
        throw new Error('Failed to process tickets')
      }
    } catch (error) {
      console.error('Error processing tickets:', error)
      toast({
        title: "Processing Error",
        description: "There was an error processing the tickets. Please try again.",
        variant: "destructive",
      })
    }
  }

  const distributeTickets = async () => {
    try {
      const response = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsers[0] || 'admin' }),
      })

      if (response.ok) {
        const distributedTickets = await response.json()
        setExistingTickets(distributedTickets)
        toast({
          title: "Tickets Distributed",
          description: `${distributedTickets.length} tickets have been distributed to agents.`,
        })
      } else {
        throw new Error('Failed to distribute tickets')
      }
    } catch (error) {
      console.error('Error distributing tickets:', error)
      toast({
        title: "Distribution Error",
        description: "There was an error distributing the tickets.",
        variant: "destructive",
      })
    }
  }

  const assignLevelBasedOnTTR = (ticket: Ticket): string => {
    const { category, TTR } = ticket
    if (!category || !TTR) return 'Unknown'

    const [hours, minutes, seconds] = TTR.split(':').map(Number)
    const ttrInMinutes = hours * 60 + minutes + seconds / 60

    if (category === 'K1') {
      if (ttrInMinutes > 540) return 'L7'
      if (ttrInMinutes > 360) return 'L6'
      if (ttrInMinutes > 240) return 'L5'
      if (ttrInMinutes > 150) return 'L4'
      if (ttrInMinutes > 90) return 'L3'
      if (ttrInMinutes > 60) return 'L2'
      return 'L1'
    } else if (category === 'K2') {
      if (ttrInMinutes > 90) return 'L3'
      if (ttrInMinutes > 60) return 'L2'
      return 'L1'
    } else if (category === 'K3') {
      if (ttrInMinutes > 60) return 'L2'
      return 'L1'
    }

    return 'Unknown'
  }

  const shouldCloseTicket = (ticket: Ticket): boolean => {
    const { category, TTR } = ticket
    if (!category || !TTR) return false

    const [hours, minutes, seconds] = TTR.split(':').map(Number)
    const ttrInMinutes = hours * 60 + minutes + seconds / 60

    if (category === 'K2' && ttrInMinutes > 90) return true
    if (category === 'K3' && ttrInMinutes > 60) return true

    return false
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload and Distribute Tickets (Admin Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="mb-4 block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
          disabled={isUploading || isCategorizing}
        />
        {(isUploading || isCategorizing) && (
          <p className="text-blue-600">
            {isUploading ? 'Uploading...' : 'Categorizing tickets...'}
          </p>
        )}
        <Button
          onClick={handleProcessTickets}
          className="w-full"
          disabled={csvData.length === 0 || isUploading || isCategorizing}
        >
          Process Tickets
        </Button>
        <Button
          onClick={distributeTickets}
          className="w-full"
          disabled={existingTickets.length === 0 || loggedInUsers.length === 0}
        >
          Distribute Tickets to Agents
        </Button>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Processing Summary:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Uploaded tickets: {csvData.length}</li>
            <li>New tickets to add: {csvData.filter(ticket => !existingTickets.some(et => et.Incident === ticket.Incident)).length}</li>
            <li>Existing tickets to update: {csvData.filter(ticket => existingTickets.some(et => et.Incident === ticket.Incident)).length}</li>
            <li>Total tickets after processing: {existingTickets.length}</li>
            <li>Logged-in users: {loggedInUsers.join(', ')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
