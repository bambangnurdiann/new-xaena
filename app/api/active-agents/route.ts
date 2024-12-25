import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('xaena_db')
    const usersCollection = db.collection('login_user')

    const activeAgents = await usersCollection
      .find({ loggedIn: true })
      .project({
        username: 1,
        loginTime: 1,
        lastActivity: 1,
        lastLogoutTime: 1,
        isWorking: 1,
        loggedIn: 1,
        _id: 0
      })
      .toArray()

    // Format dates and ensure boolean values
    const formattedAgents = activeAgents.map(agent => ({
      ...agent,
      loginTime: agent.loginTime || agent.lastActivity || new Date().toISOString(),
      lastLogoutTime: agent.lastLogoutTime || 'Never',
      isWorking: Boolean(agent.isWorking),
      loggedIn: Boolean(agent.loggedIn)
    }))

    return NextResponse.json(formattedAgents)
  } catch (error) {
    console.error('Error fetching active agents:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

