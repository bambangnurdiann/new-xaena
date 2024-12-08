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

    // Create the response
    const response = NextResponse.json({ 
      message: result.modifiedCount === 1 ? 'Logged out successfully' : 'User not found'
    }, { 
      status: result.modifiedCount === 1 ? 200 : 404 
    })

    // Clear the session token cookie
    response.cookies.set('session_token', '', {
      maxAge: 0, // This makes the cookie expire immediately
      path: '/',  // Ensure the cookie is deleted across the site
      httpOnly: true, // Ensures the cookie cannot be accessed by JavaScript
      secure: true,   // Only sent over HTTPS
      sameSite: 'strict' // Adds additional security
    })

    return response
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
