// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  
  // 1. Initialize the response object
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Load Environment Variables (using the keys that your server reads)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in middleware context.');
  }

  // 3. Create the Server Client for the middleware context
  const supabase = createServerClient(
    SUPABASE_URL, // Use the non-prefixed URL
    SUPABASE_ANON_KEY, // Use the non-prefixed Key
    {
      cookies: {
        // READ: Read cookies from the incoming request headers
        getAll() {
          return request.cookies.getAll()
        },
        // WRITE: Set cookies on the response object to send back to the browser
        setAll(cookiesToSet) {
          // This block ensures cookies are set on the request and then the response

          // First, set on the request to ensure Server Components see the fresh tokens
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // Then, clone the response to get a fresh object
          supabaseResponse = NextResponse.next({ request })
          
          // Finally, set cookies on the response to send the fresh token to the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. IMPORTANT: Force session revalidation
  // This sends a request to the Supabase Auth server to refresh the token if expired.
  // This is essential for security and maintaining a continuous session.
  await supabase.auth.getUser()

  // 5. Return the response containing the refreshed cookies
  return supabaseResponse
}