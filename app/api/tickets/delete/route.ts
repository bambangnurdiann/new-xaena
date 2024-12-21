export const dynamic = 'force-dynamic'; // Ensure dynamic route processing


import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface Ticket {
  Incident: string;
  assignedTo?: string;
  status?: string;
  lastAssignedTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  detailCase?: string;
  analisa?: string;
  escalationLevel?: string;
}

export async function DELETE(request: Request) {
  try {
    const { incident }: { incident: string } = await request.json(); // Explicitly type the request body to ensure 'incident' is a string

    if (!incident) {
      return NextResponse.json({ error: 'Incident is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('xaena_db');
    const ticketsCollection = db.collection<Ticket>('tickets');  // Use the Ticket type here

    // Delete the ticket by Incident
    const result = await ticketsCollection.deleteOne({ Incident: incident });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
