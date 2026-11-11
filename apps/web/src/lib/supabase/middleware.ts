import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const HARDCODED_PIN = '7977303911';

export async function updateSession(request: NextRequest) {
  const pinCookie = request.cookies.get('jalkhoj_pin')?.value;
  const isPinAuthenticated = pinCookie === HARDCODED_PIN;

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth');

  // Fast path: PIN already verified
  if (isPinAuthenticated) {
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/trips';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Allow /auth routes (e.g. /auth/callback for Google OAuth redirect)
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Check Supabase Auth (e.g. Google OAuth session)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let isGoogleAuthenticated = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        isGoogleAuthenticated = true;
        // Also grant PIN cookie so all downstream parts work flawlessly
        response.cookies.set('jalkhoj_pin', HARDCODED_PIN, {
          path: '/',
          maxAge: 31536000,
          sameSite: 'lax',
        });
      }
    } catch {
      // Supabase unreachable or misconfigured; proceed to fallback
    }
  }

  const isAuthenticated = isPinAuthenticated || isGoogleAuthenticated;

  if (!isAuthenticated && !isAuthRoute && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/trips';
    return NextResponse.redirect(url);
  }

  return response;
}
