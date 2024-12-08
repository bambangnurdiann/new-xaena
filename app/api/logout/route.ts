export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import clientPromise from '@/lib/mongodb'

export async function POST() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const client = await clientPromise
    const db = client.db("xaena_db")
    const usersCollection = db.collection('login_user')

    // Update the user document to log them out
    const result = await usersCollection.updateOne(
      { sessionToken },
      { 
        $set: { loggedIn: false, lastLogoutTime: new Date() },
        $unset: { sessionToken: "" }
      }
    )

    if (result.modifiedCount === 1) {
      // Properly delete the session token cookie
      cookieStore.set('session_token', '', {
        maxAge: 0, 
        path: '/',  
        httpOnly: true,
        secure: true,
        sameSite: 'strict', // Added to ensure proper session handling
      })

      return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
