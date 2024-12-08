import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import clientPromise from '@/lib/mongodb'

export async function POST() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  try {
    const client = await clientPromise
    const db = client.db("xaena_db")
    const usersCollection = db.collection('login_user')

    if (sessionToken) {
      await usersCollection.updateOne(
        { sessionToken },
        { 
          $set: { loggedIn: false, lastLogoutTime: new Date() },
          $unset: { sessionToken: "" }
        }
      )
    }

    // Clear all authentication-related cookies
    cookieStore.set('session_token', '', { maxAge: 0, path: '/' })
    cookieStore.set('auth', 'false', { maxAge: 0, path: '/' })
    cookieStore.set('user', '', { maxAge: 0, path: '/' })

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

