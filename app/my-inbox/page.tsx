'use client'

import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Clock, Play, Pause, StopCircle, RefreshCw, Send } from 'lucide-react'

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
  const [ticketsProcessed, setTicketsProcessed] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const auxReasons = ['Break', 'Meeting', 'Personal', 'Training']

  const handleNoTicketsAvailable = useCallback(() => {
    setCurrentTicket(null);
    sessionStorage.removeItem('currentTicket');
    setTicketsProcessed(0);
    toast({
      title: "No Tickets Available",
      description: "There are no tickets available at the moment. Please wait for more tickets to be added.",
      variant: "default",
    });
  }, [toast]);

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
      if (!isWorking) {
        toast({
          title: "Start Working First",
          description: "You must click 'Start Working' before fetching tickets.",
          variant: "destructive",
        });
        return;
      }
      console.log("Fetching the next ticket...")
      const response = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername, fetchNewTickets: true }),
      })

      if (!response.ok) throw new Error('Failed to fetch next ticket')

      const userTickets = await response.json()
      if (userTickets.length > 0) {
        const nextTicket = userTickets[0]
        setCurrentTicket(nextTicket)
        sessionStorage.setItem('currentTicket', JSON.stringify(nextTicket))
        setDetailCase(nextTicket["Detail Case"] || '')
        setAnalisa(nextTicket.Analisa || '')
        setEscalationLevel(nextTicket["Escalation Level"] || nextTicket.level || '')
        setAvailableLevels(getAvailableLevels(nextTicket))
      } else {
        handleNoTicketsAvailable()
      }
    } catch (error) {
      console.error("Error fetching the next ticket:", error)
      toast({
        title: "Error",
        description: "Could not fetch the next ticket. Please try again.",
        variant: "destructive",
      })
    }
  }, [loggedInUsername, isWorking, toast, handleNoTicketsAvailable])

  useEffect(() => {
    const fetchTicketAndProgress = async () => {
      if (!loggedInUsername) {
        await fetchLoggedInUser()
      }

      const storedTicket = sessionStorage.getItem('currentTicket')
      if (storedTicket) {
        const parsedTicket = JSON.parse(storedTicket)
        setCurrentTicket(parsedTicket)
        setDetailCase(parsedTicket["Detail Case"] || '')
        setAnalisa(parsedTicket.Analisa || '')
        setEscalationLevel(parsedTicket["Escalation Level"] || parsedTicket.level || '')
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
        body: JSON.stringify({ username: loggedInUsername, fetchNewTickets: ticketsProcessed >= 5 }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch next ticket');
      }

      const fetchedTickets = await response.json();
      if (fetchedTickets.length > 0) {
        const nextTicket = fetchedTickets[0];
        setCurrentTicket(nextTicket);
        sessionStorage.setItem('currentTicket', JSON.stringify(nextTicket));
        setDetailCase(nextTicket["Detail Case"] || '');
        setAnalisa(nextTicket.Analisa || '');
        setEscalationLevel(nextTicket["Escalation Level"] || nextTicket.level || '');
        setAvailableLevels(getAvailableLevels(nextTicket));
        
        if (ticketsProcessed >= 5) {
          setTicketsProcessed(1);
        } else {
          setTicketsProcessed(prev => prev + 1);
        }

        // Check if this was the last available ticket
        if (fetchedTickets.length === 1) {
          toast({
            title: "Last Available Ticket",
            description: "This is the last available ticket. You'll need to wait for more tickets to be added.",
            variant: undefined,
          });
        }
      } else {
        handleNoTicketsAvailable();
      }
    } catch (error) {
      console.error('Error fetching next ticket:', error);
      toast({
        title: "Fetch Error",
        description: "An error occurred while fetching the next ticket. Please try again later.",
        variant: "destructive",
      });
    }
  }, [loggedInUsername, getAvailableLevels, handleNoTicketsAvailable, toast, ticketsProcessed]);
  

  const handleStartWorking = useCallback(async () => {
    try {
      const statusUpdateResponse = await fetch('/api/updateUserStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername, isWorking: true }),
      });
  
      if (!statusUpdateResponse.ok) {
        throw new Error('Failed to update working status');
      }

      setIsWorking(true);
      sessionStorage.setItem('isWorking', 'true');
  
      toast({
        title: "Started Working",
        description: "You can now fetch new tickets.",
      });
    } catch (error) {
      console.error('Error starting work:', error);
      toast({
        title: "Error",
        description: "An error occurred while starting to work. Please try again.",
        variant: "destructive",
      });
    }
  }, [loggedInUsername, toast]);

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
      sessionStorage.setItem('pauseReason', pauseReason)
      sessionStorage.setItem('pauseStartTime', Date.now().toString())
    }
  }, [isPaused, pauseReason, toast])

  const handleStopWorking = useCallback(async () => {
    try {
      // Call API to update user's working status
      const updateStatusResponse = await fetch('/api/updateUserStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: loggedInUsername, isWorking: false }),
      });

      if (!updateStatusResponse.ok) {
        throw new Error('Failed to update working status');
      }

      // Call API to redistribute tickets
      const redistributeResponse = await fetch('/api/ticketDistribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: loggedInUsername, isCsvUpload: false }),
      });

      if (!redistributeResponse.ok) {
        throw new Error('Failed to redistribute tickets');
      }

      // Reset local state
      setIsWorking(false);
      setCurrentTicket(null);
      setIsPaused(false);
      setPauseReason('');
      setPauseDuration(0);
      setWorkingDuration(0);
      setTicketsProcessed(0);
      sessionStorage.removeItem('isWorking');
      sessionStorage.removeItem('currentTicket');
      sessionStorage.removeItem('isPaused');
      sessionStorage.removeItem('pauseReason');
      sessionStorage.removeItem('pauseStartTime');
      sessionStorage.removeItem('workingDuration');

      toast({
        title: "Stopped Working",
        description: "You have successfully stopped working and your tickets have been redistributed.",
      });
    } catch (error) {
      console.error('Error stopping work:', error);
      toast({
        title: "Error",
        description: "An error occurred while stopping work. Please try again.",
        variant: "destructive",
      });
    }
  }, [loggedInUsername, toast]);

  const handleLogout = useCallback(async () => {
    try {
      // Reset isWorking to false before logging out
      await fetch('/api/updateUserStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername, isWorking: false }),
      });
  
      // Perform logout
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (response.ok) {
        sessionStorage.clear(); // Clear all session storage
        setCurrentTicket(null);
        setIsWorking(false);
        setIsPaused(false);
        setPauseReason('');
        setPauseDuration(0);
        setWorkingDuration(0);
        setLoggedInUsername(null);
        setTicketsProcessed(0);
  
        // Clear the cookies
        document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; 
        document.cookie = 'lastActiveTime=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
        router.push('/login'); // Redirect to login page
      } else {
        const errorData = await response.json();
        console.error('Logout failed:', errorData.error);
        toast({
          title: 'Logout Error',
          description: 'Failed to log out. Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: 'Logout Error',
        description: 'An error occurred while logging out. Please check your connection.',
        variant: 'destructive',
      });
    }
  }, [loggedInUsername, router, toast]);
  
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;
  
    const resetTimer = () => {
      clearTimeout(activityTimeout);
  
      // Set inactivity timeout to 30 minutes
      activityTimeout = setTimeout(async () => {
        console.log("User inactive for 30 minutes. Logging out...");
        await fetch('/api/updateUserStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loggedInUsername, isWorking: false }),
        });
        handleLogout(); // Log out the user
      }, 30 * 60 * 1000);
    };
  
    // Add event listeners for user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
  
    resetTimer(); // Start the timer initially
  
    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [loggedInUsername, handleLogout]);

  const handleReasonChange = useCallback((value: string) => setPauseReason(value), [])

  const handleSubmit = useCallback(async () => {
    if (!currentTicket) {
      console.error('No current ticket available');
      toast({
        title: "No Ticket Available",
        description: "There is no ticket to submit changes for.",
        variant: "destructive",
      });
      return;
    }

    if (!detailCase || !analisa || !escalationLevel) {
      console.error('Incomplete form data');
      toast({
        title: "Incomplete Form",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    const updatedTicket = {
      ...currentTicket,
      "Detail Case": detailCase,
      Analisa: analisa,
      "Escalation Level": escalationLevel,
      status: 'Completed',
    };

    try {
      console.log('Submitting updated ticket:', updatedTicket);
      const response = await fetch('/api/updateTickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTicket),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Ticket update result:', result);

      toast({
        title: "Ticket Updated",
        description: "The ticket has been successfully updated.",
      });

      setCurrentTicket(null);
      sessionStorage.removeItem('currentTicket');
      setDetailCase('');
      setAnalisa('');
      setEscalationLevel('');

      // Automatically fetch the next ticket
      fetchNextTicket();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Update Error",
        description: "An error occurred while updating the ticket. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentTicket, detailCase, analisa, escalationLevel, toast, fetchNextTicket]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return (
    <main className="min-h-screen p-6 bg-background">
      <div className="container mx-auto space-y-6">
        {showUpdateAlert && (
          <Alert>
            <AlertTitle>Ticket Update Required</AlertTitle>
            <AlertDescription>
              Tickets need to be updated! Please inform the administrator.
              <Button className="ml-4" onClick={() => setShowUpdateAlert(false)}>Dismiss</Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-card text-card-foreground">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Ticket Management System</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-lg">
                  {loggedInUsername}
                </Badge>
                <Button onClick={handleStopWorking} variant="secondary" size="icon">
                  <StopCircle className="h-4 w-4" />
                  <span className="sr-only">Stop Working</span>
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
              <NoTicketCard 
                fetchNextTicket={fetchNextTicket} 
                ticketsProcessed={ticketsProcessed}
              />
            )
          )}
        </Suspense>
      </div>
    </main>
  )
}

