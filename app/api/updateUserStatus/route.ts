// app/api/updateUserStatus/route.ts

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { username, isWorking } = await request.json();

    const client = await clientPromise;
    const db = client.db('xaena_db');
    const usersCollection = db.collection('login_user');

    // Update user status in the database
    const result = await usersCollection.updateOne(
      { username },
      { $set: { isWorking } }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

