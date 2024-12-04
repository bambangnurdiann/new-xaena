'use client'

import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Clock, Play, Pause, LogOut, RefreshCw, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingSpinner from '@/components/LoadingSpinner'

// Lazy load less critical components
const CurrentTicketCard = lazy(() => import('@/components/CurrentTicketCard'))
const NoTicketCard = lazy(() => import('@/components/NoTicketCard'))

// interface Ticket {
 // Incident: string
 // "Detail Case"?: string
 // Analisa?: string
 // "Escalation Level"?: string
 // assignedTo?: string
 // lastAssignedTime?: number
 //// status?: string
 // category?: string
 /// level?: string
 // SID?: string
//  TTR?: number
//}

export default function MyInbox() {
  const [mounted, setMounted] = useState(false)
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null)
  const [currentTicket, setCurrentTicket] = useState<any | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [workingDuration, setWorkingDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseDuration, setPauseDuration] = useState(0)
  const [pauseReason, setPauseReason] = useState('')
  const [showUpdateAlert, setShowUpdateAlert] = useState(false)
  const [detailCase, setDetailCase] = useState('')
  const [analisa, setAnalisa] = useState('')
  const [escalationLevel, setEscalationLevel] = useState<string>('1')
  const availableLevels = ['1', '2', '3']
  const auxReasons = ['Coffee Break', 'Meeting', 'Other']

  // Note: If dynamic updates to availableLevels or auxReasons are needed in the future,
  // consider converting these back to state variables with their respective setters.

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchLoggedInUser()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorking) {
      interval = setInterval(() => {
        setWorkingDuration((prev) => prev + 1000);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  useEffect(() => {
    let pauseInterval: NodeJS.Timeout | undefined;
    if (isPaused) {
      pauseInterval = setInterval(() => {
        setPauseDuration((prev) => prev + 1000);
      }, 1000);
    } else {
      clearInterval(pauseInterval);
    }
    return () => clearInterval(pauseInterval);
  }, [isPaused]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to logout')
      router.push('/login')
      toast({
        title: 'Logout Successful',
        description: 'You have been successfully logged out.',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error logging out:', error)
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      })
    }
  }, [router, toast])

  const fetchLoggedInUser = useCallback(async () => {
    try {
      const response = await fetch('/api/checkLoggedInUsers')
      if (!response.ok) throw new Error('Failed to fetch logged-in user')
      const data = await response.json()
      if (data.loggedInUsers && data.loggedInUsers.length > 0) {
        setLoggedInUsername(data.loggedInUsers[0])
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.loggedInUsers[0]}`,
          variant: "default",
        })
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

  const handleNoTicketsAvailable = useCallback(() => {
    toast({
      title: "No Tickets Available",
      description: "There are currently no tickets available for you.",
      variant: "default",
    })
  }, [toast])

  const handleStartWorking = useCallback(async () => {
    setIsWorking(true)
    sessionStorage.setItem('isWorking', 'true')
    
    toast({
      title: "Starting work session",
      description: "Fetching your first ticket...",
      variant: "default",
    })

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
        toast({
          title: "Ticket Assigned",
          description: `Ticket ${userTickets[0].Incident} has been assigned to you.`,
          variant: "default",
        })
      } else {
        handleNoTicketsAvailable()
      }
    } catch (error) {
      console.error('Error during ticket distribution:', error)
      toast({
        title: "Error",
        description: "Failed to distribute tickets. Please try again.",
        variant: "destructive",
      })
    }
  }, [loggedInUsername, handleNoTicketsAvailable, toast])

  const handleAuxToggle = () => {
    setIsPaused(!isPaused)
    if (!isPaused) {
      setPauseReason('')
    }
  }

  const handleReasonChange = (reason: string) => {
    setPauseReason(reason)
  }

  const fetchNextTicket = useCallback(async () => {
    try {
      const response = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername }),
      })

      if (!response.ok) throw new Error('Failed to fetch next ticket')

      const userTickets = await response.json()
      if (userTickets.length > 0) {
        setCurrentTicket(userTickets[0])
        sessionStorage.setItem('currentTicket', JSON.stringify(userTickets[0]))
        toast({
          title: "Next Ticket Assigned",
          description: `Ticket ${userTickets[0].Incident} has been assigned to you.`,
          variant: "default",
        })
      } else {
        handleNoTicketsAvailable()
      }
    } catch (error) {
      console.error('Error fetching next ticket:', error)
      toast({
        title: "Error",
        description: "Failed to fetch next ticket. Please try again.",
        variant: "destructive",
      })
    }
  }, [loggedInUsername, handleNoTicketsAvailable, toast])

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/updateTicket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Incident: currentTicket.Incident,
          detailCase: detailCase,
          analisa: analisa,
          escalationLevel: escalationLevel,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket')
      }

      toast({
        title: 'Ticket Updated',
        description: 'Ticket successfully updated!',
        variant: 'default',
      })
      fetchNextTicket()
    } catch (error) {
      console.error('Error updating ticket:', error)
      toast({
        title: 'Error',
        description: 'Failed to update ticket. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-6 bg-gray-100"
    >
      <div className="container mx-auto space-y-6">
        <AnimatePresence>
          {showUpdateAlert && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Alert>
                <AlertTitle>Ticket Update Required</AlertTitle>
                <AlertDescription>
                  Tickets need to be updated! Please inform the administrator.
                  <Button className="ml-4" onClick={() => setShowUpdateAlert(false)}>Dismiss</Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

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
            <AnimatePresence mode="wait">
              {!isWorking ? (
                <motion.div
                  key="start-working"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <Button onClick={handleStartWorking} size="lg" className="w-full max-w-md">
                    <Play className="mr-2 h-4 w-4" /> Start Working
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="working-status"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
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
                  <AnimatePresence>
                    {isPaused && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-secondary p-4 rounded-md"
                      >
                        <p className="text-secondary-foreground">Paused: {pauseReason}</p>
                        <p className="text-secondary-foreground">Duration: {formatTime(Math.floor(pauseDuration / 1000))}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Suspense fallback={<LoadingSpinner />}>
          <AnimatePresence mode="wait">
            {currentTicket ? (
              <motion.div
                key="current-ticket"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentTicketCard
                  ticket={currentTicket}
                  detailCase={detailCase}
                  setDetailCase={setDetailCase}
                  analisa={analisa}
                  setAnalisa={setAnalisa}
                  escalationLevel={escalationLevel}
                  setEscalationLevel={(value: string) => setEscalationLevel(value)}
                  availableLevels={availableLevels}
                  handleSubmit={handleSubmit}
                />
              </motion.div>
            ) : (
              isWorking && (
                <motion.div
                  key="no-ticket"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <NoTicketCard fetchNextTicket={fetchNextTicket} />
                </motion.div>
              )
            )}
          </AnimatePresence>
        </Suspense>
      </div>
    </motion.main>
  )
}

