export const dynamic = 'force-dynamic'; // Ensure dynamic route processing


import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: Request) {
  console.log('API route hit: /api/updateTickets')
  try {
    const updatedTicket = await request.json()
    console.log('Received ticket data:', updatedTicket)

    const client = await clientPromise
    const db = client.db("xaena_db")
    const ticketsCollection = db.collection('tickets')
    const ticketLogsCollection = db.collection('ticketLogs')

    // Update the ticket in the main collection
    const updateResult = await ticketsCollection.updateOne(
      { Incident: updatedTicket.Incident },
      { 
        $set: {
          "Detail Case": updatedTicket["Detail Case"],
          Analisa: updatedTicket.Analisa,
          "Escalation Level": updatedTicket["Escalation Level"],
          status: 'Completed',
          lastUpdated: new Date().toISOString()
        }
      }
    )

    // If update is successful, create and insert the ticket log
    if (updateResult.modifiedCount > 0) {
      const ticketLog = {
        ticketId: updatedTicket.Incident,
        action: 'Update',
        username: updatedTicket.assignedTo,
        details: {
          detailCase: updatedTicket["Detail Case"],
          analisa: updatedTicket.Analisa,
          escalationLevel: updatedTicket["Escalation Level"]
        },
        timestamp: new Date().toISOString()
      }

      console.log('Ticket log:', ticketLog)

      // Insert the log into MongoDB (this is a separate operation)
      await ticketLogsCollection.insertOne(ticketLog)

      return NextResponse.json({ message: 'Ticket updated and log saved successfully' })
    } else {
      return NextResponse.json({ error: 'Ticket not found or not updated' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
