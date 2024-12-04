export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { WithId, Document } from 'mongodb';

// Helper functions moved to utils to keep route handler focused
import {
  getWIBTime,
  isMaxEscalationLevel,
  escalateLevel,
  assignLevelBasedOnTTR,
  shouldCloseTicket,
} from '@/utils/ticketHelpers';

interface Ticket {
  Incident: string;
  assignedTo?: string;
  lastAssignedTime?: number;
  status?: string;
  SID?: string;
  TTR: string;
  category?: string;
  level?: string;
  lastUpdated?: string;
  'Detail Case'?: string;
  Analisa?: string;
  'Escalation Level'?: string;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const ticketsCollection = db.collection('tickets');

    const tickets = await ticketsCollection.find({}).toArray();
    return NextResponse.json(tickets);
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
    const db = client.db('xaena_db');
    const ticketsCollection = db.collection('tickets');
    const closedTicketsCollection = db.collection('closed_tickets');

    const body = await request.json();
    if (!body.ticketsToProcess || !Array.isArray(body.ticketsToProcess)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { ticketsToProcess } = body;

    // Fetch all existing tickets in one query
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

    // Process all tickets without awaiting individual operations
    for (const ticket of ticketsToProcess) {
      const existingTicket = existingTicketsMap.get(ticket.Incident) as Ticket | null;

      if (Date.now() - startTime > TIMEOUT) {
        throw new Error('Operation timeout');
      }

      if (existingTicket) {
        if (existingTicket.status === 'Completed' && !isMaxEscalationLevel(existingTicket)) {
          bulkOps.push({
            updateOne: {
              filter: { Incident: ticket.Incident },
              update: {
                $set: {
                  status: 'Active',
                  level: escalateLevel(existingTicket.level),
                  lastUpdated: currentTime,
                },
              },
            },
          });
        } else if (shouldCloseTicket(ticket, existingTicket)) {
          closeOps.push({
            updateOne: {
              filter: { ticketId: ticket.Incident },
              update: {
                $set: {
                  action: 'Closed',
                  timestamp: currentTime,
                },
              },
              upsert: true,
            },
          });

          bulkOps.push({
            deleteOne: {
              filter: { Incident: ticket.Incident },
            },
          });
        } else {
          bulkOps.push({
            updateOne: {
              filter: { Incident: ticket.Incident },
              update: {
                $set: {
                  level: assignLevelBasedOnTTR(ticket),
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
        bulkOps.push({
          insertOne: {
            document: {
              ...ticket,
              level: assignLevelBasedOnTTR(ticket),
              assignedTo: ticket.assignedTo ?? null,
              lastAssignedTime: ticket.lastAssignedTime ?? null,
              status: 'Open',
              lastUpdated: currentTime,
            },
          },
        });
      }
    }

    // Execute all operations in parallel
    const [bulkWriteResult] = await Promise.all([
      bulkOps.length > 0 ? ticketsCollection.bulkWrite(bulkOps) : null,
      closeOps.length > 0 ? closedTicketsCollection.bulkWrite(closeOps) : null,
    ]);

    return NextResponse.json({
      success: true,
      modifiedCount: bulkWriteResult?.modifiedCount ?? 0,
      insertedCount: bulkWriteResult?.insertedCount ?? 0,
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
