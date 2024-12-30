import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

interface ActiveTicketsModalProps {
  user: {
    username: string
    activeTicketDetails: Array<{
      Incident: string
      lastAssignedTime: string
      elapsedTime: number
    }>
  }
  onClose: () => void
}

export function ActiveTicketsModal({ user, onClose }: ActiveTicketsModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Active Tickets for {user.username}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident</TableHead>
              <TableHead>Assigned At</TableHead>
              <TableHead>Elapsed Time (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.activeTicketDetails.map((ticket) => (
              <TableRow key={ticket.Incident}>
                <TableCell>{ticket.Incident}</TableCell>
                <TableCell>
                  {ticket.lastAssignedTime}
                </TableCell>
                <TableCell>
                  {ticket.elapsedTime.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}

