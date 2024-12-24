export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { WithId, Document } from 'mongodb';

import {
  Ticket,
  getWIBTime,
  isMaxEscalationLevel,
  escalateLevel,
  assignLevelBasedOnTTR,
} from '@/utils/ticketHelpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    const client = await clientPromise;
    const db = client.db('xaena_debug');
    const ticketsCollection = db.collection('tickets');
    const closedTicketsCollection = db.collection('closed_tickets');

    if (view === 'dashboard') {
      const tickets = await ticketsCollection.find({
        status: { $nin: ['Completed', 'Closed'] }
      }).toArray();
      return NextResponse.json(tickets);
    } else if (view === 'log') {
      const [completedTickets, closedTickets] = await Promise.all([
        ticketsCollection.find({ status: { $in: ['Completed', 'Closed'] } }).toArray(),
        closedTicketsCollection.find({}).toArray()
      ]);

      const allCompletedTickets = [...completedTickets, ...closedTickets];
      return NextResponse.json(allCompletedTickets);
    } else {
      // Default behavior when no view parameter is provided
      const allTickets = await ticketsCollection.find({}).toArray();
      return NextResponse.json(allTickets);
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now();
    const TIMEOUT = 8000; // 8 seconds to allow for response time

    const client = await clientPromise;
    const db = client.db('xaena_debug');
    const ticketsCollection = db.collection('tickets');
    const closedTicketsCollection = db.collection('closed_tickets');

    const body = await request.json();
    if (!body.ticketsToProcess || !Array.isArray(body.ticketsToProcess)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { ticketsToProcess } = body;

    const existingTickets = await ticketsCollection
      .find({
        Incident: { $in: ticketsToProcess.map((t: Ticket) => t.Incident) },
      })
      .toArray();

    const existingTicketsMap = new Map(
      existingTickets.map(ticket => [ticket.Incident, ticket as unknown as Ticket])
    );

    const bulkOps = [];
    const closeOps = [];
    const currentTime = getWIBTime();

    for (const ticket of ticketsToProcess) {
      const existingTicket = existingTicketsMap.get(ticket.Incident) as Ticket | null;

      if (Date.now() - startTime > TIMEOUT) {
        throw new Error('Operation timeout');
      }

      if (existingTicket) {
        if (ticket.status === 'Completed' && isMaxEscalationLevel(ticket)) {
          // Close the ticket if it's completed and at max escalation level
          console.log('Closing ticket:', ticket); // Debug log
          closeOps.push({
            insertOne: {
              document: {
                ...ticket,
                action: 'Closed',
                closedAt: new Date().toISOString(),
              },
            },
          });

          bulkOps.push({
            deleteOne: {
              filter: { Incident: ticket.Incident },
            },
          });
        } else if (existingTicket.status === 'Completed' && !isMaxEscalationLevel(existingTicket)) {
          // Set to Pending if completed but not at max level
          bulkOps.push({
            updateOne: {
              filter: { Incident: ticket.Incident },
              update: {
                $set: {
                  status: 'Pending',
                  level: escalateLevel(existingTicket.level),
                  lastUpdated: currentTime,
                },
              },
            },
          });
        } else {
          // Update the ticket
          bulkOps.push({
            updateOne: {
              filter: { Incident: ticket.Incident },
              update: {
                $set: {
                  level: ticket.level || existingTicket.level,
                  assignedTo: ticket.assignedTo ?? existingTicket.assignedTo,
                  lastAssignedTime: ticket.lastAssignedTime ?? existingTicket.lastAssignedTime,
                  status: ticket.status ?? existingTicket.status,
                  lastUpdated: currentTime,
                },
              },
            },
          });
        }
      } else {
        // Insert new ticket
        bulkOps.push({
          insertOne: {
            document: {
              ...ticket,
              level: ticket.level || assignLevelBasedOnTTR(ticket),
              assignedTo: ticket.assignedTo ?? null,
              lastAssignedTime: ticket.lastAssignedTime ?? null,
              status: 'Open',
              lastUpdated: currentTime,
            },
          },
        });
      }
    }

    const [bulkWriteResult, closeWriteResult] = await Promise.all([
      bulkOps.length > 0 ? ticketsCollection.bulkWrite(bulkOps) : null,
      closeOps.length > 0 ? closedTicketsCollection.bulkWrite(closeOps) : null,
    ]);

    try {
      if (closeOps.length > 0) {
        await closedTicketsCollection.bulkWrite(closeOps);
        console.log('Tickets successfully closed:', closeOps.length);
      }
    } catch (err) {
      console.error('Error writing to closed_tickets:', err);
    }
    


    if (bulkWriteResult) {
      const updatedTickets = await ticketsCollection.find({}).toArray();
      console.log('Updated tickets:', updatedTickets);
    }

    return NextResponse.json({
      success: true,
      modifiedCount: bulkWriteResult?.modifiedCount ?? 0,
      insertedCount: bulkWriteResult?.insertedCount ?? 0,
      closedCount: closeWriteResult?.insertedCount ?? 0,
    });
  } catch (error) {
    console.error('Error processing tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to process tickets',
      details: errorMessage,
    }, { status: 500 });
  }
}

