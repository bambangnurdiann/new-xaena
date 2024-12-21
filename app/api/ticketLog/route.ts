import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const date = new Date(dateParam);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const client = await clientPromise;
    const db = client.db('xaena_db');
    const ticketLogCollection = db.collection('ticketLogs');

    const logs = await ticketLogCollection.find({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: -1 }).toArray();

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching ticket logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

