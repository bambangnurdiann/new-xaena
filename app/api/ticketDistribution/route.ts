import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";
import { WithId, Document } from 'mongodb';

type TicketStatus = 'Open' | 'Active' | 'Completed' | 'Pending';

interface Ticket {
  Incident: string;
  assignedTo?: string;
  lastAssignedTime?: number;
  status: TicketStatus;
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

let pendingTickets: Ticket[] = [];

function distributeTickets(
  tickets: Ticket[],
  loggedInUsers: string[],
  requestingUser: string,
  processedTickets: string[],
  ticketHistory: Record<string, Set<string>>,
  maxTicketsPerAgent: number = 5,
  isCsvUpload: boolean = false
): Ticket[] {
  const currentTime = Date.now();

  if (isCsvUpload) {
    console.log('Processing CSV upload redistribution...');
    
    tickets = tickets.map(ticket => {
      if (ticket.status === 'Pending') {
        console.log(`Resetting pending ticket ${ticket.Incident} with level ${ticket.level} to Open status`);
        return {
          ...ticket,
          status: 'Open',
          assignedTo: undefined,
          lastAssignedTime: undefined
        };
      }
      return ticket;
    });

    pendingTickets.forEach(pendingTicket => {
      console.log(`Processing pending ticket from buffer: ${pendingTicket.Incident}`);
      const existingTicket = tickets.find(t => t.Incident === pendingTicket.Incident);
      
      if (existingTicket) {
        existingTicket.status = 'Open';
        existingTicket.assignedTo = undefined;
        existingTicket.lastAssignedTime = undefined;
      } else {
        tickets.push({
          ...pendingTicket,
          status: 'Open',
          assignedTo: undefined,
          lastAssignedTime: undefined
        });
      }
    });

    pendingTickets = [];
    console.log('Pending tickets buffer cleared after redistribution');
  }

  tickets.forEach(ticket => {
    if (
      ticket.status === "Active" &&
      ticket.lastAssignedTime &&
      currentTime - ticket.lastAssignedTime >= REDISTRIBUTION_INTERVAL
    ) {
      ticket.assignedTo = undefined;
      ticket.lastAssignedTime = undefined;
      ticket.status = "Open";
      console.log(`Reset inactive ticket ${ticket.Incident} with level ${ticket.level}`);
    }
  });

  tickets.forEach(ticket => {
    if (ticket.status === 'Completed' && !isMaxEscalationLevel(ticket)) {
      const currentLevel = ticket.level;
      ticket.status = 'Pending';
      ticket.level = escalateLevel(currentLevel);
      ticket.assignedTo = undefined;
      ticket.lastAssignedTime = undefined;
      
      if (!pendingTickets.some(p => p.Incident === ticket.Incident)) {
        pendingTickets.push(ticket);
        console.log(`Ticket ${ticket.Incident} moved to Pending status with escalated level ${ticket.level}`);
      }
    } else if (ticket.status === 'Completed' && isMaxEscalationLevel(ticket)) {
      console.log(`Ticket ${ticket.Incident} is completed and at max level. It will be closed.`);
    }
  });

  tickets = tickets.filter(ticket => {
    if (ticket.status === 'Completed' && isMaxEscalationLevel(ticket)) {
      console.log(`Closing ticket ${ticket.Incident} due to max escalation level`);
      return false;
    }
    return true;
  });

  const currentlyAssignedCount = tickets.filter(
    ticket => ticket.assignedTo === requestingUser && ticket.status === 'Active'
  ).length;

  const remainingSlots = maxTicketsPerAgent - currentlyAssignedCount;

  if (remainingSlots <= 0) {
    console.log(`User ${requestingUser} has reached maximum ticket limit`);
    return tickets;
  }

  const availableTickets = tickets.filter(
    ticket =>
      ticket.status === 'Open' &&
      !ticket.assignedTo &&
      !processedTickets.includes(ticket.Incident) &&
      (!ticketHistory[ticket.Incident] || !ticketHistory[ticket.Incident].has(requestingUser))
  );

  availableTickets.sort((a, b) => {
    const categoryOrder = { K1: 1, K2: 2, K3: 3 };
    const levelOrder = { L7: 1, L6: 2, L5: 3, L4: 4, L3: 5, L2: 6, L1: 7 };

    if (a.category !== b.category) {
      return (categoryOrder[a.category as keyof typeof categoryOrder] || 0) -
             (categoryOrder[b.category as keyof typeof categoryOrder] || 0);
    }
    return (levelOrder[a.level as keyof typeof levelOrder] || 0) -
           (levelOrder[b.level as keyof typeof levelOrder] || 0);
  });

  for (let i = 0; i < Math.min(remainingSlots, availableTickets.length); i++) {
    const ticket = availableTickets[i];
    ticket.assignedTo = requestingUser;
    ticket.lastAssignedTime = currentTime;
    ticket.status = 'Active';
    console.log(`Assigned ticket ${ticket.Incident} to ${requestingUser} with level ${ticket.level}`);
  }

  return tickets;
}

export async function POST(request: Request) {
  try {
    const { username, isCsvUpload = false } = await request.json();
    console.log(`Processing request for username: ${username}, CSV upload: ${isCsvUpload}`);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const ticketsCollection = db.collection("tickets");
    const ticketLogCollection = db.collection("ticketLog");
    const usersCollection = db.collection("login_user");
    const closedTicketsCollection = db.collection("closed_tickets");

    const user = await usersCollection.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isWorking && !isCsvUpload) {
      console.warn(`User ${username} is not working. No tickets will be distributed.`);
      return NextResponse.json({ message: 'User is not working' });
    }

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

    const loggedInUsersFromDb = await usersCollection.find({ loggedIn: true }).toArray();
    const loggedInUsers = loggedInUsersFromDb.map(user => user.username);
    if (!loggedInUsers.includes(username)) loggedInUsers.push(username);

    const userProcessedTickets = await ticketLogCollection
      .find({ username })
      .map(log => log.ticketId)
      .toArray();

    const ticketLogs = await ticketLogCollection.find({}).toArray();
    const ticketHistory = ticketLogs.reduce((acc, log) => {
      if (!acc[log.ticketId]) acc[log.ticketId] = new Set();
      acc[log.ticketId].add(log.username);
      return acc;
    }, {} as Record<string, Set<string>>);

    const distributedTickets = distributeTickets(
      tickets,
      loggedInUsers,
      username,
      userProcessedTickets,
      ticketHistory,
      5,
      isCsvUpload
    );

    const userTickets = distributedTickets.filter(ticket => 
      ticket.assignedTo === username && ticket.status === 'Active'
    );

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

    if (operations.length > 0) {
      await ticketsCollection.bulkWrite(operations);
      console.log(`Updated ${operations.length} tickets in database`);
    }

    // Close tickets that are completed and at max escalation level
    const ticketsToClose = distributedTickets.filter(ticket => 
      ticket.status === 'Completed' && isMaxEscalationLevel(ticket)
    );

    if (ticketsToClose.length > 0) {
      const closeOperations = ticketsToClose.map(ticket => ({
        insertOne: {
          document: {
            ...ticket,
            action: 'Closed',
            closedAt: new Date().toISOString(),
          },
        },
      }));

      await closedTicketsCollection.bulkWrite(closeOperations);
      await ticketsCollection.deleteMany({ 
        Incident: { $in: ticketsToClose.map(t => t.Incident) } 
      });

      console.log(`Closed and moved ${ticketsToClose.length} tickets to closed_tickets collection`);
    }

    return NextResponse.json(userTickets);
  } catch (error) {
    console.error('Error in ticket distribution:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

