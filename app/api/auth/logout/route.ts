import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 0 // This will effectively delete the cookie
  }

  cookies().set('auth', 'false', cookieOptions)
  cookies().set('user', '', cookieOptions)
  cookies().set('session_token', '', cookieOptions)
  cookies().set('last_login', '', cookieOptions)

  return NextResponse.json({ success: true })
}

