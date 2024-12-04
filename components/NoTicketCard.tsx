import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'

interface NoTicketCardProps {
  fetchNextTicket: () => void
}

export default function NoTicketCard({ fetchNextTicket }: NoTicketCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white shadow-lg">
        <CardContent className="py-10 text-center">
          <p className="text-xl text-gray-600 mb-4">No ticket currently assigned.</p>
          <Button onClick={fetchNextTicket} variant="outline" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" /> Fetch Next Ticket
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

