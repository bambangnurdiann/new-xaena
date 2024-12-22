export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// POST to add closed ticket to MongoDB
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const closedTicketsCollection = db.collection('closed_tickets');
    const ticketsCollection = db.collection('tickets');

    // Get and log the incoming request payload to verify it
    const { tickets } = await request.json();
    console.log("Received Tickets to Close:", tickets);

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({
        error: 'Invalid or empty tickets array',
      }, { status: 400 });
    }

    // Validate each ticket in the array
    for (const ticket of tickets) {
      if (!ticket.Incident || !ticket.action || !ticket.details) {
        console.error('Invalid ticket:', ticket);
        return NextResponse.json({
          error: 'Missing required fields: Incident, action, or details',
        }, { status: 400 });
      }
    }

    // Insert the tickets into the closed_tickets collection
    const insertResult = await closedTicketsCollection.insertMany(
      tickets.map((ticket: { closedAt: string | number | Date; }) => ({
        ...ticket,
        closedAt: new Date(ticket.closedAt), // Ensure closedAt is a Date object
      }))
    );

    console.log('Inserted closed tickets:', insertResult.insertedCount);

    // Now remove the closed tickets from the `tickets` collection
    const incidentIds = tickets.map((ticket: { Incident: any; }) => ticket.Incident);
    const deleteResult = await ticketsCollection.deleteMany({
      Incident: { $in: incidentIds },
    });

    console.log('Deleted tickets from active collection:', deleteResult.deletedCount);

    return NextResponse.json({ 
      message: 'Tickets closed and saved successfully',
      insertedCount: insertResult.insertedCount,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error saving closed tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// DELETE to remove a closed ticket by Incident
export async function DELETE(request: Request) {
  try {
    // Wait for MongoDB client connection
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const closedTicketsCollection = db.collection('closed_tickets');

    const { Incident } = await request.json();

    if (!Incident) {
      return NextResponse.json({ error: 'Missing required field: Incident' }, { status: 400 });
    }

    // Remove the ticket from closedTickets collection
    const result = await closedTicketsCollection.deleteOne({ Incident });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Closed ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Closed ticket with Incident ${Incident} deleted successfully` });
  } catch (error) {
    console.error('Error deleting closed ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET to retrieve all closed tickets
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const closedTickets = await db.collection('closed_tickets').find({}).toArray();

    return NextResponse.json(closedTickets);
  } catch (error) {
    console.error('Error fetching closed tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
