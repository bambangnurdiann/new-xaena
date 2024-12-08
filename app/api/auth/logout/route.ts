import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  if (sessionToken) {
    try {
      const client = await clientPromise
      const db = client.db("xaena_db")
      const usersCollection = db.collection('login_user')

      await usersCollection.updateOne(
        { sessionToken },
        { 
          $set: { loggedIn: false, lastLogoutTime: new Date() },
          $unset: { sessionToken: "" }
        }
      )
    } catch (error) {
      console.error('Error updating user logout status:', error)
    }
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set('session_token', '', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // This will effectively delete the cookie
  })

  return response
}
