import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'

interface NoTicketCardProps {
  fetchNextTicket: () => void
}

export default function NoTicketCard({ fetchNextTicket }: NoTicketCardProps) {
  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle>No Active Ticket</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground mb-4">There are no tickets assigned to you at the moment.</p>
        <Button onClick={fetchNextTicket}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Check for New Tickets
        </Button>
      </CardContent>
    </Card>
  )
}

