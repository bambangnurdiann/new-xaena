export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  const isAuthenticated = cookieStore.get('auth')?.value === 'true'

  return NextResponse.json({ isAuthenticated })
}
