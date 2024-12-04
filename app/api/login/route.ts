export const dynamic = 'force-dynamic'; // Ensure dynamic route processing

import { NextResponse } from 'next/server'
import clientPromise from "@/lib/mongodb"
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    console.log('Login attempt for username:', username)

    const client = await clientPromise
    const db = client.db("xaena_db")
    const usersCollection = db.collection('login_user')

    const user = await usersCollection.findOne({ username, password })

    if (user) {
      console.log('User found, login successful')
      
      // Generate a session token
      const sessionToken = randomBytes(32).toString('hex')

      // Update the session token in the database
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            loggedIn: true,
            sessionToken,
          },
        }
      )

      // Set session token in a cookie
      const cookieStore = cookies()
      cookieStore.set('session_token', sessionToken, {
        httpOnly: true,
        secure: true,
        path: '/',  // Make sure the cookie is available across your entire site
      })

      // Optionally, you could also return a success response with the session token
      return NextResponse.json({ success: true, username: user.username, sessionToken })
    } else {
      console.log('Invalid credentials for username:', username)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
