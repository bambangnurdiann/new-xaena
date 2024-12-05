'use client'

import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
import { Clock, Play, Pause, LogOut, RefreshCw, Send } from 'lucide-react'

// Lazy load less critical components
const CurrentTicketCard = lazy(() => import('@/components/CurrentTicketCard'))
const NoTicketCard = lazy(() => import('@/components/NoTicketCard'))

interface Ticket {
  Incident: string
  "Detail Case"?: string
  Analisa?: string
  "Escalation Level"?: string
  assignedTo?: string
  lastAssignedTime?: number
  status?: string
  category?: string
  level?: string
  SID?: string
  TTR?: number
}

export default function MyInbox() {
  const [isWorking, setIsWorking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [pauseStartTime, setPauseStartTime] = useState(0)
  const [pauseDuration, setPauseDuration] = useState(0)
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [workingDuration, setWorkingDuration] = useState(0)
  const [detailCase, setDetailCase] = useState('')
  const [analisa, setAnalisa] = useState('')
  const [escalationLevel, setEscalationLevel] = useState('')
  const [showUpdateAlert, setShowUpdateAlert] = useState(false)
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null)
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const auxReasons = ['Break', 'Meeting', 'Personal', 'Training']

  const fetchLoggedInUser = useCallback(async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (!response.ok) throw new Error('Failed to fetch logged-in user')
      const data = await response.json()
      if (data.loggedInUsers && data.loggedInUsers.length > 0) {
        setLoggedInUsername(data.loggedInUsers[0])
      } else {
        setLoggedInUsername(null)
        toast({
          title: "No Users Logged In",
          description: "There are no logged-in users currently.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching logged-in user:', error)
      toast({
        title: "Error",
        description: "Could not fetch logged-in user. Please check your connection.",
        variant: "destructive",
      })
    }
  }, [toast])

  const fetchNextTicketHandler = useCallback(async () => {
    try {
      console.log("Fetching the next ticket...")
      // Add the logic to fetch the next ticket here
    } catch (error) {
      console.error("Error fetching the next ticket:", error)
      toast({
        title: "Error",
        description: "Could not fetch the next ticket. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    const fetchTicketAndProgress = async () => {
      if (!loggedInUsername) {
        await fetchLoggedInUser()
      }

      const storedTicket = sessionStorage.getItem('currentTicket')
      if (storedTicket) {
        const parsedTicket = JSON.parse(storedTicket)
        setCurrentTicket(parsedTicket)
        setAvailableLevels(getAvailableLevels(parsedTicket))
      } else if (loggedInUsername) {
        fetchNextTicketHandler()
      }
    }

    fetchTicketAndProgress()

    const savedIsWorking = sessionStorage.getItem('isWorking') === 'true'
    const savedIsPaused = sessionStorage.getItem('isPaused') === 'true'
    const savedPauseReason = sessionStorage.getItem('pauseReason') || ''
    const savedPauseStartTime = Number(sessionStorage.getItem('pauseStartTime')) || 0
    const savedWorkingDuration = Number(sessionStorage.getItem('workingDuration')) || 0

    setIsWorking(savedIsWorking)
    setIsPaused(savedIsPaused)
    setPauseReason(savedPauseReason)
    setPauseStartTime(savedPauseStartTime)
    setWorkingDuration(savedWorkingDuration)

    const alertInterval = setInterval(() => setShowUpdateAlert(true), 20 * 60 * 1000)

    return () => {
      clearInterval(alertInterval)
    }
  }, [loggedInUsername, fetchLoggedInUser, fetchNextTicketHandler])

  useEffect(() => {
    if (currentTicket) {
      setAvailableLevels(getAvailableLevels(currentTicket))
    }
    let workInterval: NodeJS.Timeout
    let pauseInterval: NodeJS.Timeout

    if (isWorking && !isPaused) {
      workInterval = setInterval(() => {
        setWorkingDuration((prev) => {
          const newDuration = prev + 1
          sessionStorage.setItem('workingDuration', String(newDuration))
          return newDuration
        })
      }, 1000)
    }

    if (isPaused) {
      pauseInterval = setInterval(() => {
        setPauseDuration(Date.now() - pauseStartTime)
      }, 1000)
    }

    return () => {
      clearInterval(workInterval)
      clearInterval(pauseInterval)
    }
  }, [isWorking, isPaused, pauseStartTime, currentTicket])

  const getAvailableLevels = useCallback((ticket: Ticket): string[] => {
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
    const currentLevelIndex = levels.indexOf(ticket.level || 'L1')
    let maxLevel = 'L7'

    if (ticket.category === 'K2') maxLevel = 'L3'
    else if (ticket.category === 'K3') maxLevel = 'L2'
    else if (ticket.category !== 'K1') {
      console.warn(`Unknown category: ${ticket.category}`)
      maxLevel = 'L1'
    }

    const maxLevelIndex = levels.indexOf(maxLevel)
    return levels.slice(currentLevelIndex, maxLevelIndex + 1)
  }, [])

  const fetchNextTicket = useCallback(async () => {
    try {
      const response = await fetch(`/api/ticketDistribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: loggedInUsername }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch next ticket')
      }

      const fetchedTickets = await response.json()
      if (fetchedTickets.length > 0) {
        const unfinishedTickets = fetchedTickets.filter(
          (ticket: Ticket) => ticket.status !== 'Completed'
        )

        if (unfinishedTickets.length > 0) {
          const nextTicket = unfinishedTickets[0]
          setCurrentTicket(nextTicket)
          sessionStorage.setItem('currentTicket', JSON.stringify(nextTicket))
          setDetailCase(nextTicket["Detail Case"] || '')
          setAnalisa(nextTicket.Analisa || '')
          setEscalationLevel(nextTicket["Escalation Level"] || nextTicket.level || '')
          setAvailableLevels(getAvailableLevels(nextTicket))
        } else {
          handleNoTicketsAvailable()
        }        
      } else {
        handleNoTicketsAvailable()
      }
    } catch (error) {
      console.error('Error fetching next ticket:', error)
      toast({
        title: "Fetch Error",
        description: "An error occurred while fetching the next ticket. Please try again later.",
        variant: "destructive",
      })
    }
  }, [loggedInUsername, getAvailableLevels, toast])

  const handleNoTicketsAvailable = useCallback(() => {
    setCurrentTicket(null)
    sessionStorage.removeItem('currentTicket')
    toast({
      title: "No Tickets Available",
      description: "There are no tickets available at the moment.",
      variant: "default",
    })
  }, [toast])

  const handleStartWorking = useCallback(async () => {
    setIsWorking(true)
    sessionStorage.setItem('isWorking', 'true')
    
    try {
      const response = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername }),
      })

      if (!response.ok) throw new Error('Failed to distribute tickets')

      const userTickets = await response.json()
      if (userTickets.length > 0) {
        setCurrentTicket(userTickets[0])
        sessionStorage.setItem('currentTicket', JSON.stringify(userTickets[0]))
      } else {
        handleNoTicketsAvailable()
      }
    } catch (error) {
      console.error('Error during ticket distribution:', error)
    }
  }, [loggedInUsername, handleNoTicketsAvailable])

  const handleAuxToggle = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      setPauseReason('')
      setPauseDuration(0)
      setPauseStartTime(0)
      sessionStorage.setItem('isPaused', 'false')
      sessionStorage.setItem('pauseReason', '')
      sessionStorage.setItem('pauseStartTime', '0')
    } else {
      if (!pauseReason) {
        toast({
          title: "Pause Reason Required",
          description: "Please select a pause reason before pausing.",
          variant: "destructive",
        })
        return
      }
      setIsPaused(true)
      setPauseStartTime(Date.now())
      sessionStorage.setItem('isPaused', 'true')
    }
  }, [isPaused, pauseReason, toast])

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        sessionStorage.removeItem('currentTicket')
        setCurrentTicket(null)
        setIsWorking(false)
        setIsPaused(false)
        setPauseReason('')
        setPauseDuration(0)
        setWorkingDuration(0)
        setLoggedInUsername(null)
        document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        router.push('/login')
      } else {
        const errorData = await response.json()
        console.error('Logout failed:', errorData.error)
        toast({
          title: "Logout Error",
          description: "Failed to log out. Please try again later.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error during logout:', error)
      toast({
        title: "Logout Error",
        description: "An error occurred while logging out. Please check your connection.",
        variant: "destructive",
      })
    }
  }, [router, toast])

  const handleReasonChange = useCallback((value: string) => setPauseReason(value), [])

  const handleSubmit = useCallback(async () => {
    if (!currentTicket) {
      toast({
        title: "No Ticket Available",
        description: "There is no ticket to submit changes for.",
        variant: "destructive",
      })
      return
    }

    if (!detailCase || !analisa || !escalationLevel) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      })
      return
    }

    const updatedTicket = {
      ...currentTicket,
      "Detail Case": detailCase,
      Analisa: analisa,
      "Escalation Level": escalationLevel,
      status: 'Completed',
    }

    try {
      const response = await fetch('/api/updateTickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTicket),
      })

      if (response.ok) {
        toast({
          title: "Ticket Updated",
          description: "The ticket has been successfully updated.",
        })

        setCurrentTicket(null)
        sessionStorage.removeItem('currentTicket')
        setDetailCase('')
        setAnalisa('')
        setEscalationLevel('')

        fetchNextTicket()
      } else {
        throw new Error('Failed to update ticket')
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      toast({
        title: "Update Error",
        description: "An error occurred while updating the ticket. Please try again.",
        variant: "destructive",
      })
    }
  }, [currentTicket, detailCase, analisa, escalationLevel, toast, fetchNextTicket])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return (
    <main className="min-h-screen p-6 bg-gray-100">
      <div className="container mx-auto space-y-6">
        {showUpdateAlert && (
          <Alert>
            <AlertTitle>Ticket Update Required</AlertTitle>
            <AlertDescription>
              Tickets need to be updated! Please inform the administrator.
              <Button className="ml-4" onClick={() => setShowUpdateAlert(false)}>Dismiss</Button>
            </AlertDescription></Alert>
        )}

        <Card className="bg-white shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Ticket Management System</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-lg">
                  {loggedInUsername}
                </Badge>
                <Button onClick={handleLogout} variant="secondary" size="icon">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Logout</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!isWorking ? (
              <div className="text-center">
                <Button onClick={handleStartWorking} size="lg" className="w-full max-w-md">
                  <Play className="mr-2 h-4 w-4" /> Start Working
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">Working Time: {formatTime(workingDuration)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select onValueChange={handleReasonChange} disabled={isPaused}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {auxReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAuxToggle} variant={isPaused ? "default" : "secondary"} size="sm">
                      {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                  </div>
                </div>
                {isPaused && (
                  <div className="bg-secondary p-4 rounded-md">
                    <p className="text-secondary-foreground">Paused: {pauseReason}</p>
                    <p className="text-secondary-foreground">Duration: {formatTime(Math.floor(pauseDuration / 1000))}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={<div>Loading ticket...</div>}>
          {currentTicket ? (
            <CurrentTicketCard
              ticket={currentTicket}
              detailCase={detailCase}
              setDetailCase={setDetailCase}
              analisa={analisa}
              setAnalisa={setAnalisa}
              escalationLevel={escalationLevel}
              setEscalationLevel={setEscalationLevel}
              availableLevels={availableLevels}
              handleSubmit={handleSubmit}
            />
          ) : (
            isWorking && (
              <NoTicketCard fetchNextTicket={fetchNextTicket} />
            )
          )}
        </Suspense>
      </div>
    </main>
  )
}
