import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";
import { WithId, Document } from 'mongodb';

interface Ticket {
  Incident: string;
  assignedTo?: string;
  lastAssignedTime?: number;
  status?: string;
  category?: string;
  level?: string;
  SID?: string;
  TTR?: number;
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    console.log('Redistributing tickets for user:', username);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const ticketsCollection = db.collection("tickets");

    // Fetch unassigned tickets
    const unassignedTickets = await ticketsCollection.find({
      status: { $ne: 'Completed' },
      assignedTo: { $exists: false },
    }).toArray();

    if (unassignedTickets.length === 0) {
      console.log('No tickets available for redistribution.');
      return NextResponse.json({ message: 'No tickets available for redistribution' }, { status: 200 });
    }

    // Assign tickets to the user
    const currentTime = Date.now();
    unassignedTickets.forEach(ticket => {
      ticket.assignedTo = username;
      ticket.lastAssignedTime = currentTime;
      ticket.status = 'Active';
    });

    // Update the tickets in the database
    const operations = unassignedTickets.map(ticket => ({
      updateOne: {
        filter: { Incident: ticket.Incident },
        update: {
          $set: {
            assignedTo: ticket.assignedTo,
            lastAssignedTime: ticket.lastAssignedTime,
            status: ticket.status,
          },
        },
        upsert: true,
      },
    }));

    const updateResult = await ticketsCollection.bulkWrite(operations);
    console.log('Redistribution update result:', updateResult);

    return NextResponse.json(unassignedTickets, { status: 200 });

  } catch (error) {
    console.error('Error redistributing tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
