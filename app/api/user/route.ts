//user/loggedInUsers/route.ts

import { NextResponse } from 'next/server'

// This is a mock implementation. In a real-world scenario, you'd query your database or authentication system.
const mockLoggedInUsers = ['96312', '96313', '96314']

export async function GET() {
  try {
    // In a real implementation, you would fetch this data from your database or authentication system
    const loggedInUsers = mockLoggedInUsers

    return NextResponse.json({ loggedInUsers })
  } catch (error) {
    console.error('Error checking logged-in users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}