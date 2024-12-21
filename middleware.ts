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
    // Redirect only if the user is accessing protected pages
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

  // Avoid redirect loop on login page
  if (request.nextUrl.pathname === '/login') {
    // If token exists but expired or invalid, clear cookies
    const response = NextResponse.next();
    response.cookies.set('session_token', '', { maxAge: 0, path: '/' }); // Clear invalid token
    return response; // Let user access login page
  }
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
