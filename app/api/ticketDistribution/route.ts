export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

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

const REDISTRIBUTION_INTERVAL = 20 * 60 * 1000; // 20 minutes in milliseconds

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    console.log('Processing request for username:', username);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const ticketsCollection = db.collection("tickets");
    const ticketLogCollection = db.collection("ticketLog");
    const usersCollection = db.collection("login_user");

        // Periksa apakah user sedang "Working"
        const user = await usersCollection.findOne({ username });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
    
        if (!user.isWorking) {
          console.warn(`User ${username} is not working. No tickets will be distributed.`);
          return NextResponse.json({ message: 'User is not working' });
        }
    
        console.log(`User ${username} is working. Proceeding with ticket distribution.`);

    // Fetch all tickets from the database
    const ticketsFromDb: WithId<Document>[] = await ticketsCollection.find({ status: { $ne: 'Completed' } }).toArray();
    const tickets: Ticket[] = ticketsFromDb.map(doc => ({
      Incident: doc.Incident as string,
      assignedTo: doc.assignedTo as string | undefined,
      lastAssignedTime: doc.lastAssignedTime as number | undefined,
      status: doc.status as string | undefined,
      category: doc.category as string | undefined,
      level: doc.level as string | undefined,
      SID: doc.SID as string | undefined,
      TTR: doc.TTR as number | undefined,
    }));
    console.log('Retrieved tickets from database:', tickets);

    // Fetch logged-in users
    const loggedInUsersFromDb = await usersCollection.find({ loggedIn: true }).toArray();
    const loggedInUsers = loggedInUsersFromDb.map(user => user.username);
    if (!loggedInUsers.includes(username)) loggedInUsers.push(username);  // Add the current user if not already in the list
    console.log('Active users for distribution:', loggedInUsers);

    // Distribusikan tiket kepada pengguna yang login dengan pembatasan maksimal 5 tiket per agen
    const maxTicketsPerAgent = 5;
    const currentTime = Date.now();
    const assignedTickets: Ticket[] = [];

    tickets.forEach(ticket => {
      if (!ticket.assignedTo && assignedTickets.length < maxTicketsPerAgent) {
        // Jika tiket belum di-assign dan agen belum mencapai batas maksimal tiket
        ticket.assignedTo = username;
        ticket.lastAssignedTime = currentTime;
        ticket.status = 'Active';  // Tiket yang di-assign menjadi 'Active'
        assignedTickets.push(ticket);
      }
    });

    console.log(`Assigned tickets to user ${username}:`, assignedTickets);

    // Fetch tickets processed by the user
    const userProcessedTickets = await ticketLogCollection
      .find({ username })
      .map(log => log.ticketId)
      .toArray();
    console.log(`Tickets processed by user ${username}:`, userProcessedTickets);

    // Build ticket history for all users
    const ticketLogs = await ticketLogCollection.find({}).toArray();
    const ticketHistory = ticketLogs.reduce((acc, log) => {
      const { ticketId, username } = log;
      if (!acc[ticketId]) acc[ticketId] = new Set();
      acc[ticketId].add(username);
      return acc;
    }, {} as Record<string, Set<string>>);
    console.log('Ticket history:', ticketHistory);

    // Distribute tickets based on current status
    const distributedTickets = distributeTickets(
      tickets,
      loggedInUsers,
      username,
      userProcessedTickets,
      ticketHistory
    );
    console.log('Distributed tickets after processing:', distributedTickets);

    // Filter tickets assigned to the requesting user
    const userTickets = distributedTickets.filter(ticket => ticket.assignedTo === username);
    console.log('Returning response with user tickets count:', userTickets.length);

    // Update tickets in the database
    const operations = distributedTickets.map(ticket => ({
      updateOne: {
        filter: { Incident: ticket.Incident },  // Make sure you are filtering by a unique field (e.g., Incident)
        update: {
          $set: {
            // Add only the fields that need to be updated, excluding '_id'
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

    const updateResult = await ticketsCollection.bulkWrite(operations);
    console.log('Database update result:', updateResult);

    return NextResponse.json(userTickets);
  } catch (error) {
    console.error('Error in ticket distribution:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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

  // 1. Reactivate completed tickets not at max escalation level
  const completedTicketsToReactivate = tickets.filter(ticket =>
    ticket.status === "Completed" && !isMaxEscalationLevel(ticket)
  );

  completedTicketsToReactivate.forEach(ticket => {
    ticket.status = "Active"; // Set status back to active
    ticket.level = escalateLevel(ticket.level); // Escalate to the next level
    ticket.assignedTo = undefined; // Reset assignment for redistribution
    ticket.lastAssignedTime = undefined; // Reset last assigned time
    console.log(`Reactivating ticket ${ticket.Incident} to level ${ticket.level}`);
  });

  // 2. Reset assignments for inactive tickets
  tickets.forEach(ticket => {
    if (ticket.lastAssignedTime && currentTime - ticket.lastAssignedTime >= REDISTRIBUTION_INTERVAL) {
      ticket.assignedTo = undefined;
      ticket.lastAssignedTime = undefined;
      console.log(`Ticket ${ticket.Incident} reset due to inactivity.`);
    }
  });

  // 3. Filter unassigned tickets and exclude already processed tickets
  const unassignedTickets = tickets.filter(ticket =>
    !ticket.assignedTo &&
    ticket.status !== "Completed" &&
    (!processedTickets.includes(ticket.Incident)) &&
    (!ticketHistory[ticket.Incident] || !ticketHistory[ticket.Incident].has(requestingUser))
  );

  console.log('Unassigned tickets (after filtering processed):', unassignedTickets);

  // 4. Sort tickets by priority (category and level)
  unassignedTickets.sort((a, b) => {
    const categoryOrder = { K1: 1, K2: 2, K3: 3 };
    const levelOrder = { L7: 1, L6: 2, L5: 3, L4: 4, L3: 5, L2: 6, L1: 7 };

    if (a.category !== b.category) {
      return (categoryOrder[a.category as keyof typeof categoryOrder] || 0) - (categoryOrder[b.category as keyof typeof categoryOrder] || 0);
    }
    return (levelOrder[a.level as keyof typeof levelOrder] || 0) - (levelOrder[b.level as keyof typeof levelOrder] || 0);
  });

  // 5. Assign limited tickets to requesting user
  const assignedTickets: Ticket[] = [];
  for (const ticket of unassignedTickets) {
    if (assignedTickets.length >= maxTicketsPerAgent) break;
    ticket.assignedTo = requestingUser;
    ticket.lastAssignedTime = currentTime;
    assignedTickets.push(ticket);
  }

  console.log(`Assigned ${assignedTickets.length} tickets to user: ${requestingUser}`);

  return [...tickets];
}

function escalateLevel(currentLevel?: string): string {
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  if (!currentLevel) return 'L1'; // Default to L1 if no current level
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel; // Increment level or keep max
}

function isMaxEscalationLevel(ticket: Ticket): boolean {
  const maxLevels: Record<string, string> = { K1: 'L7', K2: 'L3', K3: 'L2' };
  return ticket.level === maxLevels[ticket.category || 'K1'];
}
