// app/api/updateUserStatus/route.ts

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// /api/updateUserStatus
export async function POST(request: Request) {
  try {
    const { username, isWorking } = await request.json();

    if (!username || typeof isWorking !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const usersCollection = db.collection('login_user');

    // Update the isWorking status
    const result = await usersCollection.updateOne(
      { username },
      { $set: { isWorking, lastActivity: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}
