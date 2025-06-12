import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for these paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/auth/forgot-password")
  ) {
    console.log(`[Middleware] Skipping auth check for excluded path: ${pathname}`)
    return NextResponse.next()
  }

  console.log(`[Middleware] Processing auth check for: ${pathname}`)
  return await updateSession(request)
}

// This matcher is still needed but we'll handle the exclusions in the middleware function
export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
