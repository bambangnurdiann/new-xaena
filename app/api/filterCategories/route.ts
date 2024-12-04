export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";

interface Ticket {
  Incident: string;
  SID?: string;
  TTR: string;
  category?: string;
  level?: string;
}

export async function POST(request: Request) {
  try {
    const { tickets } = await request.json();
    console.log('Received tickets from frontend:', tickets);
    
    const client = await clientPromise;
    console.log('Connected to MongoDB');
    const db = client.db(process.env.MONGODB_DB);
    console.log(`Using database: ${process.env.MONGODB_DB}`);
    const filterCategoryCollection = db.collection("filter_kategori");
    console.log('Using collection: filter_kategori');

    const categorizedTickets = await Promise.all(tickets.map(async (ticket: Ticket) => {
      // Step 1: Check SID in filter_kategori collection
      const categoryDoc = await filterCategoryCollection.findOne({ SID: ticket.SID });

      if (categoryDoc) {
        console.log(`SID ${ticket.SID} found in database with category:`, categoryDoc.KATEGORI);
        return {
          ...ticket,
          category: categoryDoc.KATEGORI,
        };
      } else {
        // If SID is not found, categorize as K3
        const updatedTicket = {
          ...ticket,
          category: 'K3'
        };
        
        // Apply K3-specific logic
        const [hours, minutes] = ticket.TTR.split(':').map(Number);
        const ttrInMinutes = hours * 60 + minutes;
        
        if (ttrInMinutes > 60) {
          updatedTicket.level = 'L2';
        } else if (ttrInMinutes > 30) {
          updatedTicket.level = 'L1';
        }

        return updatedTicket;
      }
    }));

    console.log('Categorized tickets:', categorizedTickets);
    return NextResponse.json(categorizedTickets);
  } catch (error) {
    console.error('Error categorizing tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}