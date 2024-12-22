'use client'

import { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw } from 'lucide-react'

interface Ticket {
  _id?: string
  Incident: string
  assignedTo?: string
  lastAssignedTime?: number
  status: 'Open' | 'Active' | 'Completed' | 'Pending'
  SID?: string
  TTR: string
  category?: string
  level?: string
  lastUpdated?: string
  action?: string
}

interface ClosedTicket {
    Incident: string;
    action: string;
    details: string;
    closedAt: string;
}

const isMaxEscalationLevel = (ticket: Ticket): boolean => {
  const maxLevels: Record<string, string> = { K1: 'L7', K2: 'L3', K3: 'L2' };
  return ticket.level === maxLevels[ticket.category || 'K1'];
};


export default function UploadTickets() {
  const [csvData, setCsvData] = useState<Ticket[]>([])
  const [existingTickets, setExistingTickets] = useState<Ticket[]>([])
  const [loggedInUsers, setLoggedInUsers] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null)
  const { toast } = useToast()

  const fetchExistingTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const tickets = await response.json()
        console.log('Fetched existing tickets:', tickets)
        setExistingTickets(Array.isArray(tickets) ? tickets : [])
      } else {
        throw new Error('Failed to fetch existing tickets')
      }
    } catch (error) {
      console.error('Error fetching existing tickets:', error)
      setExistingTickets([])
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

  const fetchLastUploadTime = useCallback(async () => {
    try {
      const response = await fetch('/api/lastUploadTime')
      if (response.ok) {
        const data = await response.json()
        setLastUploadTime(data.lastUploadTime ? new Date(data.lastUploadTime) : null)
      } else {
        throw new Error('Failed to fetch last upload time')
      }
    } catch (error) {
      console.error('Error fetching last upload time:', error)
      toast({
        title: "Error",
        description: "Failed to fetch last upload time. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchExistingTickets()
    fetchLoggedInUsers()
    fetchLastUploadTime()
  }, [fetchExistingTickets, fetchLoggedInUsers, fetchLastUploadTime])

//  useEffect(() => {
 //   const storedLastUploadTime = localStorage.getItem('lastUploadTime')
 //   if (storedLastUploadTime) {
 //     setLastUploadTime(new Date(storedLastUploadTime))
  //  }
 // }, [])

 const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (file) {
    setIsUploading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const tickets = (results.data as Record<string, string | undefined>[]).map((row): Ticket => ({
          Incident: row.Incident || '',
          SID: row.SID,
          TTR: row.TTR || '00:00:00',
          category: row.category,
          status: 'Open',
        })).filter((ticket) => ticket.Incident.trim() !== '')

        try {
          setIsCategorizing(true)
          const categorizedTickets = await fetchFilterCategories(tickets)
          setCsvData(categorizedTickets)
          await updateLastUploadTime()
          toast({
            title: "CSV Uploaded",
            description: `${categorizedTickets.length} tickets have been uploaded and categorized.`,
          })
        } catch (error: unknown) {
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
      error: (error: unknown) => {
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

const updateLastUploadTime = async () => {
  try {
    const response = await fetch('/api/lastUploadTime', {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to update last upload time')
    }

    const data = await response.json()
    setLastUploadTime(new Date(data.lastUploadTime))
  } catch (error) {
    console.error('Error updating last upload time:', error)
    toast({
      title: "Error",
      description: "Failed to update last upload time.",
      variant: "destructive",
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
        });
        return;
    }

    console.log("Processing tickets. CSV Data:", csvData);
    console.log("Existing tickets:", existingTickets);

    const existingIncidents = new Set(existingTickets.map(ticket => ticket.Incident));
    const newTickets = csvData.filter(ticket => !existingIncidents.has(ticket.Incident));
    const ticketsToUpdate = csvData.filter(ticket => existingIncidents.has(ticket.Incident));
    const currentTime = Date.now();
    const INACTIVITY_LIMIT = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

    console.log("New tickets:", newTickets);
    console.log("Tickets to update:", ticketsToUpdate);

    const updatedTickets = ticketsToUpdate.map(csvTicket => {
        const existingTicket = existingTickets.find(ticket => ticket.Incident === csvTicket.Incident);

        if (existingTicket) {
            console.log(`Updating ticket ${csvTicket.Incident}:`);
            console.log(`Old TTR: ${existingTicket.TTR}, New TTR: ${csvTicket.TTR}`);

            return {
                ...existingTicket,
                ...csvTicket,
            };
        }
        return csvTicket;
    });

    const processedTickets = [...newTickets, ...updatedTickets].map(ticket => {
        const level = assignLevelBasedOnTTR(ticket);
        return {
            ...ticket,
            level,
        };
    });

    console.log("Processed tickets:", processedTickets);

    // Tickets not in the new CSV
    const ticketsNotInCSV = existingTickets.filter(
        ticket => !csvData.some(csvTicket => csvTicket.Incident === ticket.Incident)
    );

    const ticketsToClose: ClosedTicket[] = [];
    const ticketsToKeepOpen: Ticket[] = [];

    // Process tickets not in CSV
    ticketsNotInCSV.forEach(ticket => {
        const lastUpdatedTime = ticket.lastUpdated ? new Date(ticket.lastUpdated).getTime() : currentTime;

        if (currentTime - lastUpdatedTime > INACTIVITY_LIMIT) {
            console.log(
                `Ticket ${ticket.Incident} is inactive for more than 1 hour. Moving to closed_tickets.`
            );

            ticketsToClose.push({
                Incident: ticket.Incident,
                action: ticket.action || "Expired",
                details: `Ticket ${ticket.Incident} expired due to inactivity.`,
                closedAt: new Date().toISOString(),
            });
        } else {
          if (ticket.status === 'Completed' && !isMaxEscalationLevel(ticket)) {
            ticket.status = "Pending";
            console.log(
              `Ticket ${ticket.Incident} set to Pending status for redistribution.`
            );
          }
          ticketsToKeepOpen.push(ticket);
        }
    });

    console.log("Tickets to close:", ticketsToClose);
    console.log("Tickets to keep open:", ticketsToKeepOpen);

    try {
        // First, save all tickets
        const response = await fetch("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ticketsToProcess: [...processedTickets, ...ticketsToKeepOpen],
            }),
        });

        if (response.ok) {
            const savedTickets = await response.json();
            console.log("Saved tickets:", savedTickets);

            // Handle closed tickets if any
            if (ticketsToClose.length > 0) {
                const closeResponse = await fetch("/api/closedTickets", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tickets: ticketsToClose,
                    }),
                });

                if (!closeResponse.ok) {
                    throw new Error("Failed to move tickets to closed_tickets");
                }
            }

            // Now trigger ticket distribution with isCsvUpload flag
            const distributionResponse = await fetch("/api/ticketDistribution", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    username: loggedInUsers[0] || "admin",
                    isCsvUpload: true
                }),
            });

            if (!distributionResponse.ok) {
                throw new Error("Failed to distribute tickets");
            }

            // Fetch fresh tickets after distribution
            await fetchExistingTickets();

            toast({
                title: "Tickets Processed",
                description: `${savedTickets.length} tickets have been processed and redistributed.`,
            });

            setExistingTickets(prevTickets => {
                const closedTicketIncidents = new Set(ticketsToClose.map(ticket => ticket.Incident));
                return [
                    ...prevTickets.filter(ticket => !closedTicketIncidents.has(ticket.Incident)),
                    ...processedTickets,
                ];
            });
            setCsvData([]);
        } else {
            throw new Error("Failed to process tickets");
        }
    } catch (error) {
        console.error("Error processing tickets:", error);
        toast({
            title: "Processing Error",
            description: "There was an error processing the tickets. Please try again.",
            variant: "destructive",
        });
    }
  }

  const assignLevelBasedOnTTR = (ticket: Ticket): string => {
    const { category, TTR } = ticket
    if (!category || !TTR) return 'Unknown'

    const [hours, minutes, seconds] = TTR.split(':').map(Number)
    const ttrInMinutes = (hours * 60) + minutes + (seconds / 60)

    console.log(`Calculating level for ticket ${ticket.Incident}:`)
    console.log(`Category: ${category}, TTR: ${TTR}`)
    console.log(`TTR in minutes: ${ttrInMinutes}`)

    if (category === 'K1') {
      if (ttrInMinutes > 9 * 60) return 'L7'
      if (ttrInMinutes > 6 * 60) return 'L6'
      if (ttrInMinutes > 4 * 60) return 'L5'
      if (ttrInMinutes > 2.5 * 60) return 'L4'
      if (ttrInMinutes > 1.5 * 60) return 'L3'
      if (ttrInMinutes > 60) return 'L2'
      if (ttrInMinutes > 30) return 'L1'
    } else if (category === 'K2') {
      if (ttrInMinutes > 1.5 * 60) return 'L3'
      if (ttrInMinutes > 60) return 'L2'
      if (ttrInMinutes > 30) return 'L1'
    } else if (category === 'K3') {
      if (ttrInMinutes > 60) return 'L2'
      if (ttrInMinutes > 30) return 'L1'
    }

    return 'L1'
  }

  const shouldCloseTicket = (ticket: Ticket): boolean => {
    const { category, TTR } = ticket
    if (!category || !TTR) return false

    const isExisting = existingTickets.some(et => et.Incident === ticket.Incident)
    if (!isExisting) return false

    const [hours, minutes, seconds] = TTR.split(':').map(Number)
    const ttrInMinutes = (hours * 60) + minutes + (seconds / 60)

    console.log(`Checking close condition for ticket ${ticket.Incident}:`)
    console.log(`Category: ${category}, TTR: ${TTR}`)
    console.log(`TTR in minutes: ${ttrInMinutes}`)
    console.log(`Is existing ticket: ${isExisting}`)

    if (category === 'K2' && ttrInMinutes > 1.5 * 60) return true
    if (category === 'K3' && ttrInMinutes > 60) return true

    return false
  }

  const distributeTickets = async () => {
    try {
      const response = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: loggedInUsers }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const distributedTickets = await response.json()
      console.log('Distributed tickets:', distributedTickets)
      setExistingTickets(distributedTickets)

      toast({
        title: "Tickets Distributed",
        description: `${distributedTickets.length} tickets have been distributed to agents.`,
      })
    } catch (error: unknown) {
      console.error('Error distributing tickets:', error)
      toast({
        title: "Distribution Error",
        description: `There was an error distributing the tickets. Please try again. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const handleStopWorking = useCallback(async () => {
    try {
      toast({
        title: "Stopped Working",
        description: "You have successfully stopped working.",
      })
    } catch (error) {
      console.error('Error stopping work:', error)
      toast({
        title: "Error",
        description: "An error occurred while stopping work. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload and Distribute Tickets (Admin Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Upload a CSV file with &quot;Incident&quot;, &quot;SID&quot;, &quot;TTR&quot;, and &quot;category&quot; columns.
          </p>
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
        </div>

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

        <Button onClick={handleStopWorking} variant="secondary" size="icon">
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Stop Working</span>
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

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Last Uploaded Data:</h3>
          <p className="text-sm text-gray-600">
            {lastUploadTime
              ? lastUploadTime.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : 'No data has been uploaded yet.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

