import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getWIBTime } from '@/utils/ticketHelpers';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const ticketsCollection = db.collection('tickets');
    const closedTicketsCollection = db.collection('closed_tickets');

    const currentTime = getWIBTime();

    // Fetch all tickets
    const allTickets = await ticketsCollection.find({}).toArray();

    // Move all tickets to closed_tickets
    if (allTickets.length > 0) {
      await closedTicketsCollection.insertMany(
        allTickets.map(ticket => ({
          ...ticket,
          closedAt: currentTime,
          closeReason: 'Daily Reset'
        }))
      );

      // Clear the tickets collection
      await ticketsCollection.deleteMany({});
    }

    return NextResponse.json({ success: true, message: 'Daily reset completed successfully' });
  } catch (error) {
    console.error('Error during daily reset:', error);
    return NextResponse.json({ error: 'Internal server error during daily reset' }, { status: 500 });
  }
}

