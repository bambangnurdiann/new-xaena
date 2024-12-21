export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// POST untuk Menambahkan atau Memperbarui Tiket
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const ticketsCollection = db.collection('tickets');

    const ticketData = await request.json();
    
    // Validasi data tiket (misalnya memeriksa apakah field yang dibutuhkan ada)
    if (!ticketData.Incident || !ticketData.TTR) {
      return NextResponse.json({ error: 'Missing required fields: Incident or TTR' }, { status: 400 });
    }

    // Cek apakah tiket sudah ada
    const existingTicket = await ticketsCollection.findOne({ Incident: ticketData.Incident });

    if (existingTicket) {
      // Perbarui tiket yang sudah ada
      await ticketsCollection.updateOne(
        { Incident: ticketData.Incident },
        { $set: { ...ticketData, updatedAt: new Date() } }
      );
      return NextResponse.json({ message: 'Ticket updated successfully' });
    } else {
      // Jika tiket belum ada, buat tiket baru
      await ticketsCollection.insertOne({ ...ticketData, createdAt: new Date() });
      return NextResponse.json({ message: 'Ticket created successfully' });
    }
  } catch (error) {
    console.error('Error handling ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE untuk Menghapus Tiket Berdasarkan Incident
export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const ticketsCollection = db.collection('tickets');

    const { Incident } = await request.json();

    if (!Incident) {
      return NextResponse.json({ error: 'Missing required field: Incident' }, { status: 400 });
    }

    const result = await ticketsCollection.deleteOne({ Incident });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Ticket with Incident ${Incident} deleted successfully` });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET untuk Mengambil Semua Tiket
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("xaena_db");
    const ticketsCollection = db.collection('tickets');

    const tickets = await ticketsCollection.find({}).toArray();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
