import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { WithId, Document } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { username, ticketId } = await request.json();

    if (!username || !ticketId) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const ticketsCollection = db.collection('tickets');
    const usersCollection = db.collection('login_user');

    // Check if the user is working
    const user = await usersCollection.findOne({ username });
    if (!user || !user.isWorking) {
      return NextResponse.json({ error: 'User is not in working status' }, { status: 400 });
    }

    // Find the ticket and update its status and assignedTo fields
    const result = await ticketsCollection.findOneAndUpdate(
      { Incident: ticketId, status: 'Open' },
      { 
        $set: { 
          status: 'Active', 
          assignedTo: username,
          lastAssignedTime: new Date()
        } 
      },
      { returnDocument: 'after' }
    );

    if (!result || !result.value) {
      return NextResponse.json({ error: 'Ticket not found or already assigned' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Started working on ticket successfully', 
      ticket: result.value 
    });
  } catch (error) {
    console.error('Error starting work on ticket:', error);
    return NextResponse.json({ error: 'Failed to start working on ticket' }, { status: 500 });
  }
}