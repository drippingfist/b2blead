import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// List of public routes that don't require authentication
const publicRoutes = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/magic-link",
  "/auth/callback",
  "/auth/set-password",
  "/auth/accept-invite",
]

export async function middleware(request: NextRequest) {
  try {
    // Process the request through Supabase middleware
    const response = await updateSession(request)

    // Return the response directly to avoid additional processing
    return response
  } catch (error) {
    console.error("Middleware error:", error)

    // Get the pathname
    const { pathname } = new URL(request.url)

    // If this is a public route, allow access
    if (publicRoutes.some((route) => pathname.startsWith(route)) || pathname === "/") {
      return NextResponse.next()
    }

    // For protected routes with errors, redirect to login
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
