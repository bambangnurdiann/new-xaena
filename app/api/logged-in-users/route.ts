export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const usersCollection = db.collection('login_user');

    // Fetch all logged-in users
    const loggedInUsers = await usersCollection.find({ loggedIn: true }).toArray();
    const usernames = loggedInUsers.map(user => user.username);

    return NextResponse.json({ loggedInUsers: usernames });
  } catch (error) {
    console.error('Error fetching logged-in users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
