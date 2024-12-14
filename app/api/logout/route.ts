export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';

export async function POST() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const usersCollection = db.collection('login_user');

    const result = await usersCollection.updateOne(
      { sessionToken },
      {
        $set: { loggedIn: false, lastLogoutTime: new Date() },
        $unset: { sessionToken: '' },
      }
    );

    if (result.modifiedCount === 1) {
      // Prepare response to clear the session cookie
      const response = NextResponse.json({ message: 'Logged out successfully' });
      response.cookies.set('session_token', '', {
        maxAge: 0, // Immediately expire
        path: '/', // Clear across the site
        httpOnly: true, // Not accessible via JavaScript
        secure: process.env.NODE_ENV === 'production', // Use `true` only in production
      });
      return response;
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
