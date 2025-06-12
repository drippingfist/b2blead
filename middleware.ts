import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for these paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/app/auth/reset-password") || // Add this line to handle the /app prefix
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/app/auth/forgot-password") // Add this line too for consistency
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
