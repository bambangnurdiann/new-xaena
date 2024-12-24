import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface NoTicketCardProps {
  fetchNextTicket: () => void
  ticketsProcessed: number
}

export default function NoTicketCard({ fetchNextTicket, ticketsProcessed }: NoTicketCardProps) {
  const isTicketLimitReached = ticketsProcessed >= 5;
  const noTicketsAvailable = ticketsProcessed === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {noTicketsAvailable
            ? "No Tickets Available"
            : isTicketLimitReached
            ? "Ticket Limit Reached"
            : "No Current Ticket"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {noTicketsAvailable
            ? "There are no tickets available at the moment. Please wait for more tickets to be added."
            : isTicketLimitReached
            ? "You've processed 5 tickets. Click the button below to fetch the next batch of tickets."
            : `You've processed ${ticketsProcessed} ticket${ticketsProcessed !== 1 ? 's' : ''}. Click the button below to fetch the next ticket.`}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={fetchNextTicket} disabled={noTicketsAvailable}>
          {isTicketLimitReached ? "Fetch New Tickets" : "Fetch Next Ticket"}
        </Button>
      </CardFooter>
    </Card>
  )
}

