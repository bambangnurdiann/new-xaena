import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const ticketsCollection = db.collection('tickets');
    const usersCollection = db.collection('login_user');

    // Query tickets with a single aggregation pipeline for better performance
    const [ticketStats] = await ticketsCollection.aggregate([
      {
        $facet: {
          totalTickets: [{ $count: 'count' }],
          ticketsAssigned: [{ $match: { assignedTo: { $ne: null } } }, { $count: 'count' }],
          ticketsInProgress: [{ $match: { status: 'Active' } }, { $count: 'count' }],
          ticketsLeft: [{ $match: { assignedTo: null } }, { $count: 'count' }]
        }
      }
    ]).toArray();

    // Get logged in agents count
    const loggedInAgents = await usersCollection.countDocuments({ loggedIn: true });

    // Format the response
    const response = {
      totalTickets: ticketStats.totalTickets[0]?.count || 0,
      ticketsAssigned: ticketStats.ticketsAssigned[0]?.count || 0,
      ticketsInProgress: ticketStats.ticketsInProgress[0]?.count || 0,
      ticketsLeft: ticketStats.ticketsLeft[0]?.count || 0,
      loggedInAgents
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

