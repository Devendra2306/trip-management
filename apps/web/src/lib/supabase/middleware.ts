import { NextResponse, type NextRequest } from 'next/server';

export const HARDCODED_PIN = '7977303911';

export async function updateSession(request: NextRequest) {
  const pinCookie = request.cookies.get('jalkhoj_pin')?.value;
  const isAuthenticated = pinCookie === HARDCODED_PIN;

  const isLoginRoute = request.nextUrl.pathname.startsWith('/login');

  // If not authenticated and not on login page or landing page, redirect to login
  if (!isAuthenticated && !isLoginRoute && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If authenticated and trying to go to login, redirect to trips
  if (isAuthenticated && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/trips';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
