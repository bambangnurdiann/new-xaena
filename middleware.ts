import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  const protectedPages = [
    '/dashboard',
    '/home',
    '/my-inbox',
    '/admin/upload-tickets',
    '/ticket-log'
  ];

  if (!sessionToken) {
    // Redirect unauthenticated users trying to access protected pages
    if (protectedPages.some(page => request.nextUrl.pathname.startsWith(page))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Check for idle timeout
  const response = NextResponse.next();
  const lastActiveTime = request.cookies.get('lastActiveTime')?.value;
  const currentTime = Date.now();
  const idleThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds

  if (lastActiveTime && currentTime - parseInt(lastActiveTime, 10) > idleThreshold) {
    console.log('User has been idle for too long, logging out...');

    // Clear session and cookies if user is idle
    response.cookies.set('session_token', '', { maxAge: 0 });
    response.cookies.set('lastActiveTime', '', { maxAge: 0 });

    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Update last active time for authenticated users
  response.cookies.set('lastActiveTime', `${currentTime}`, {
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  // Redirect already authenticated users away from login
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/home',
    '/my-inbox',
    '/admin/upload-tickets',
    '/ticket-log',
    '/login',
  ],
};
