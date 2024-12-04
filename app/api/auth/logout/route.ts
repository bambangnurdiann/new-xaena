import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  cookies().set('auth', 'false', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // This will effectively delete the cookie
  })

  return NextResponse.json({ success: true })
}