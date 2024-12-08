import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get('session_token')?.value

  console.log('Session token:', sessionToken) // Debug log

  if (!sessionToken) {
    console.log('No session token found') // Debug log
    return NextResponse.json({ isAuthenticated: false })
  }

  try {
    const client = await clientPromise
    const db = client.db("xaena_db")
    const usersCollection = db.collection('login_user')

    const user = await usersCollection.findOne({ sessionToken })

    console.log('User found:', user ? 'Yes' : 'No') // Debug log

    if (user) {
      return NextResponse.json({ isAuthenticated: true, userId: user.userId })
    } else {
      return NextResponse.json({ isAuthenticated: false })
    }
  } catch (error) {
    console.error('Error checking authentication:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
