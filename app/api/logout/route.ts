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

    const result = await usersCollection.updateOne(
      { sessionToken },
      { 
        $set: { loggedIn: false, lastLogoutTime: new Date() },
        $unset: { sessionToken: "" }
      }
    )

    if (result.modifiedCount === 1) {
      // Delete the session token cookie
      cookieStore.set('session_token', '', {
        maxAge: 0, // This makes the cookie expire immediately
        path: '/',  // Ensure the cookie is deleted across the site
        httpOnly: true, // Ensures the cookie cannot be accessed by JavaScript
        secure: true,   // Only sent over HTTPS
      })
      return NextResponse.json({ message: 'Logged out successfully' })
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
