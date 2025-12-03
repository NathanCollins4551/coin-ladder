// src/proxy.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware' // Correct import path

/**
 * The proxy function executes the updateSession logic to refresh and validate
 * the session cookie on the edge, before the request reaches the server components.
 * This is the replacement for the deprecated 'middleware' function.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // This matcher ensures the proxy runs on all application paths
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}