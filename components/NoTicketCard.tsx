import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'

interface NoTicketCardProps {
  fetchNextTicket: () => void
}

const NoTicketCard: React.FC<NoTicketCardProps> = ({ fetchNextTicket }) => {
  return (
    <Card className="bg-white shadow-lg">
      <CardContent className="py-10 text-center">
        <p className="text-xl text-gray-600 mb-4">No ticket currently assigned.</p>
        <Button onClick={fetchNextTicket} variant="outline" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" /> Fetch Next Ticket
        </Button>
      </CardContent>
    </Card>
  )
}

export default NoTicketCard