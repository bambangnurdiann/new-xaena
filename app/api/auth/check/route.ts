import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  const isAuthenticated = cookieStore.get('auth')?.value === 'true'
  const userId = cookieStore.get('user')?.value

  return NextResponse.json({ isAuthenticated, userId })
}

