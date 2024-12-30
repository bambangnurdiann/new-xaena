export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { stringify } from 'csv-stringify/sync'

export async function POST(request: NextRequest) {
  try {
    const userPerformance = await request.json()

    const csvData = stringify(userPerformance, {
      header: true,
      columns: {
        username: 'Username',
        totalTickets: 'Total Tickets',
        averageTime: 'Average Time (minutes)',
        activeTickets: 'Active Tickets',
      },
    })

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=user_performance.csv',
      },
    })
  } catch (error) {
    console.error('Error exporting user performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

