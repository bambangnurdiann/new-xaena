import TicketLog from '../api/tickets/TicketLog'

export default function TicketLogPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Ticket Log</h1>
      <TicketLog />
    </div>
  )
}
