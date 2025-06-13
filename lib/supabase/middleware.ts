// Make sure the updateSession function properly handles session state
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  try {
    // Create authenticated Supabase Client
    const supabase = createMiddlewareClient({ request, response: NextResponse.next() })

    // Refresh session if expired - this will set the cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session and trying to access protected route, redirect to login
    const requestUrl = new URL(request.url)
    const isAuthRoute = requestUrl.pathname.startsWith("/auth/")
    const isApiRoute = requestUrl.pathname.startsWith("/api/")
    const isRootRoute = requestUrl.pathname === "/"

    if (!session && !isAuthRoute && !isApiRoute && !isRootRoute) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // If session exists but on auth route (except callbacks), redirect to dashboard
    if (session && isAuthRoute && !requestUrl.pathname.includes("/callback")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.next()
  } catch (e) {
    // If there's an error, redirect to login as a fallback
    console.error("Auth middleware error:", e)
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }
}
