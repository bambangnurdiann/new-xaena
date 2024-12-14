import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;

  // List of protected pages that require authentication
  const protectedPages = [
    '/dashboard',
    '/home',
    '/my-inbox',
    '/admin/upload-tickets',
    '/ticket-log'
  ];

  // Check if the user is trying to access any of the protected pages
  if (protectedPages.some(page => request.nextUrl.pathname.startsWith(page))) {
    if (!sessionToken) {
      // Redirect to login if no valid session
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Prevent accessing the login page if already authenticated
  if (request.nextUrl.pathname === '/login') {
    if (sessionToken) {
      // Redirect to dashboard if already logged in
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Allow requests to proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/home', '/my-inbox', '/admin/upload-tickets', '/ticket-log', '/login'], // Apply middleware to these paths
};
