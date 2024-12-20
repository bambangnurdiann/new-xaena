type TicketStatus = 'Open' | 'Active' | 'Completed';

import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";
import { WithId, Document } from 'mongodb';

interface Ticket {
  Incident: string;
  assignedTo?: string;
  lastAssignedTime?: number;
  status: TicketStatus;  // Make this required and use the TicketStatus type
  category?: string;
  level?: string;
  SID?: string;
  TTR?: number;
}

const REDISTRIBUTION_INTERVAL = 20 * 60 * 1000; // 20 minutes in milliseconds

function isMaxEscalationLevel(ticket: Ticket): boolean {
  const maxLevels: Record<string, string> = { K1: 'L7', K2: 'L3', K3: 'L2' };
  return ticket.level === maxLevels[ticket.category || 'K1'];
}

function escalateLevel(currentLevel?: string): string {
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  if (!currentLevel) return 'L1';
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel;
}

function distributeTickets(
  tickets: Ticket[],
  loggedInUsers: string[],
  requestingUser: string,
  processedTickets: string[],
  ticketHistory: Record<string, Set<string>>,
  maxTicketsPerAgent: number = 5
): Ticket[] {
  const currentTime = Date.now();

  // Reset assignments only for active tickets that are inactive
  tickets.forEach(ticket => {
    if (
      ticket.status === "Active" &&
      ticket.lastAssignedTime && 
      currentTime - ticket.lastAssignedTime >= REDISTRIBUTION_INTERVAL
    ) {
      ticket.assignedTo = undefined;
      ticket.lastAssignedTime = undefined;
      ticket.status = "Open";
      console.log(`Active ticket ${ticket.Incident} reset due to inactivity.`);
    }
  });

  // Reactivate completed tickets not at max escalation level
  const completedTicketsToReactivate = tickets.filter(ticket =>
    ticket.status === "Completed" && !isMaxEscalationLevel(ticket)
  );

  completedTicketsToReactivate.forEach(ticket => {
    ticket.status = "Open";
    ticket.level = escalateLevel(ticket.level);
    ticket.assignedTo = undefined;
    ticket.lastAssignedTime = undefined;
    console.log(`Reactivating ticket ${ticket.Incident} to level ${ticket.level}`);
  });

  // Count currently assigned tickets for the requesting user
  const currentlyAssignedCount = tickets.filter(
    ticket => ticket.assignedTo === requestingUser && ticket.status === 'Active'
  ).length;

  // Calculate how many more tickets can be assigned
  const remainingSlots = maxTicketsPerAgent - currentlyAssignedCount;

  if (remainingSlots <= 0) {
    console.log(`User ${requestingUser} already has maximum tickets assigned`);
    return tickets;
  }

  // Filter unassigned tickets and exclude already processed tickets
  const unassignedTickets = tickets.filter(
    ticket => 
      !ticket.assignedTo && 
      ticket.status === 'Open' &&  // This is sufficient, no need to check for 'Completed'
      !processedTickets.includes(ticket.Incident) &&
      (!ticketHistory[ticket.Incident] || !ticketHistory[ticket.Incident].has(requestingUser))
  );

  // Sort tickets by priority
  unassignedTickets.sort((a, b) => {
    const categoryOrder = { K1: 1, K2: 2, K3: 3 };
    const levelOrder = { L7: 1, L6: 2, L5: 3, L4: 4, L3: 5, L2: 6, L1: 7 };

    if (a.category !== b.category) {
      return (categoryOrder[a.category as keyof typeof categoryOrder] || 0) - 
             (categoryOrder[b.category as keyof typeof categoryOrder] || 0);
    }
    return (levelOrder[a.level as keyof typeof levelOrder] || 0) - 
           (levelOrder[b.level as keyof typeof levelOrder] || 0);
  });

  // Assign only up to the remaining slots
  const ticketsToAssign = unassignedTickets.slice(0, remainingSlots);
  
  ticketsToAssign.forEach(ticket => {
    ticket.assignedTo = requestingUser;
    ticket.lastAssignedTime = currentTime;
    ticket.status = 'Active';
    console.log(`Assigned ticket ${ticket.Incident} to ${requestingUser}`);
  });

  return tickets;
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    console.log('Processing request for username:', username);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const ticketsCollection = db.collection("tickets");
    const ticketLogCollection = db.collection("ticketLog");
    const usersCollection = db.collection("login_user");

    // Check if user is working
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isWorking) {
      console.warn(`User ${username} is not working. No tickets will be distributed.`);
      return NextResponse.json({ message: 'User is not working' });
    }

    // Fetch tickets
    const ticketsFromDb = await ticketsCollection.find({}).toArray();
    const tickets: Ticket[] = ticketsFromDb.map(doc => ({
      Incident: doc.Incident,
      assignedTo: doc.assignedTo,
      lastAssignedTime: doc.lastAssignedTime,
      status: doc.status,
      category: doc.category,
      level: doc.level,
      SID: doc.SID,
      TTR: doc.TTR,
    }));

    // Fetch logged-in users
    const loggedInUsersFromDb = await usersCollection.find({ loggedIn: true }).toArray();
    const loggedInUsers = loggedInUsersFromDb.map(user => user.username);
    if (!loggedInUsers.includes(username)) loggedInUsers.push(username);

    // Fetch processed tickets
    const userProcessedTickets = await ticketLogCollection
      .find({ username })
      .map(log => log.ticketId)
      .toArray();

    // Build ticket history
    const ticketLogs = await ticketLogCollection.find({}).toArray();
    const ticketHistory = ticketLogs.reduce((acc, log) => {
      if (!acc[log.ticketId]) acc[log.ticketId] = new Set();
      acc[log.ticketId].add(log.username);
      return acc;
    }, {} as Record<string, Set<string>>);

    // Distribute tickets
    const distributedTickets = distributeTickets(
      tickets,
      loggedInUsers,
      username,
      userProcessedTickets,
      ticketHistory,
      5 // Set maximum tickets per agent to 5
    );

    // Filter tickets for the requesting user
    const userTickets = distributedTickets.filter(ticket => 
      ticket.assignedTo === username && ticket.status === 'Active'
    );

    // Update tickets in database
    const operations = distributedTickets.map(ticket => ({
      updateOne: {
        filter: { Incident: ticket.Incident },
        update: {
          $set: {
            assignedTo: ticket.assignedTo,
            lastAssignedTime: ticket.lastAssignedTime,
            status: ticket.status,
            category: ticket.category,
            level: ticket.level,
            SID: ticket.SID,
            TTR: ticket.TTR
          },
        },
        upsert: true,
      },
    }));

    await ticketsCollection.bulkWrite(operations);

    return NextResponse.json(userTickets);
  } catch (error) {
    console.error('Error in ticket distribution:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

