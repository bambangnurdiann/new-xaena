export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    // Tunggu hingga client MongoDB siap
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const closedTicketsCollection = db.collection('closed_tickets');

    const closedTicketData = await request.json();
    
    // Validasi data tiket yang ditutup
    if (!closedTicketData.ticketId || !closedTicketData.action || !closedTicketData.details) {
      return NextResponse.json({ error: 'Missing required fields: ticketId, action, or details' }, { status: 400 });
    }

    // Masukkan data tiket yang ditutup ke dalam koleksi closedTickets
    await closedTicketsCollection.insertOne({
      ...closedTicketData,
      closedAt: new Date(), // Tanggal dan waktu tiket ditutup
    });

    return NextResponse.json({ message: 'Ticket closed and saved successfully' });
  } catch (error) {
    console.error('Error saving closed ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE untuk Menghapus Tiket yang sudah ditutup berdasarkan ticketId
export async function DELETE(request: Request) {
  try {
    // Tunggu hingga client MongoDB siap
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const closedTicketsCollection = db.collection('closed_tickets');

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing required field: ticketId' }, { status: 400 });
    }

    const result = await closedTicketsCollection.deleteOne({ ticketId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Closed ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Closed ticket with ticketId ${ticketId} deleted successfully` });
  } catch (error) {
    console.error('Error deleting closed ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET untuk Mengambil Semua Tiket yang sudah ditutup
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
