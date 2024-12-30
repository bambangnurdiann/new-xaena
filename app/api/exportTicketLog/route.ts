export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { stringify } from 'csv-stringify/sync'

export async function POST(request: NextRequest) {
  try {
    const { tickets, startDate, endDate } = await request.json()

    console.log('Received tickets:', tickets.length);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    const startDateTime = new Date(startDate).getTime()
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999)
    const endDateTimeMs = endDateTime.getTime()

    const filteredTickets = tickets.filter((ticket: any) => {
      const ticketTime = new Date(ticket.Timestamp).getTime();
      const closedTime = ticket['Closed At'] ? new Date(ticket['Closed At']).getTime() : ticketTime;
      return (ticketTime >= startDateTime && ticketTime <= endDateTimeMs) || 
             (closedTime >= startDateTime && closedTime <= endDateTimeMs);
    })

    console.log('Filtered tickets:', filteredTickets.length);

    if (filteredTickets.length === 0) {
      console.log('No tickets found in the specified date range');
      return NextResponse.json({ error: 'No tickets found in the specified date range' }, { status: 404 })
    }

    const csvData = stringify(filteredTickets, {
      header: true,
      columns: {
        Timestamp: 'Timestamp',
        Incident: 'Incident',
        User: 'User',
        Status: 'Status',
        'Detail Case': 'Detail Case',
        Analisa: 'Analisa',
        'Escalation Level': 'Escalation Level',
        Level: 'Level',
        'Closed At': 'Closed At'
      },
    })

    console.log('CSV data length:', csvData.length);

    if (csvData.length === 0) {
      console.log('Generated CSV is empty');
      return NextResponse.json({ error: 'Generated CSV is empty' }, { status: 500 })
    }

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=ticket_log_${startDate}_to_${endDate}.csv`,
      },
    })
  } catch (error) {
    console.error('Error exporting ticket log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

