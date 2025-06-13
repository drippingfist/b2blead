import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // Create a response object first
  const response = NextResponse.next()

  try {
    // Create authenticated Supabase Client with the response object
    const supabase = createMiddlewareClient({ req: request, res: response })

    // Refresh session if expired - this will set the cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session and trying to access protected route, redirect to login
    const requestUrl = new URL(request.url)
    const isAuthRoute = requestUrl.pathname.startsWith("/auth/")
    const isApiRoute = requestUrl.pathname.startsWith("/api/")
    const isRootRoute = requestUrl.pathname === "/"
    const publicRoutes = [
      "/auth/login",
      "/auth/sign-up",
      "/auth/forgot-password",
      "/auth/magic-link",
      "/auth/reset-password",
      "/auth/callback",
    ]

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.includes(requestUrl.pathname)

    if (!session && !isAuthRoute && !isApiRoute && !isRootRoute) {
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("redirect_to", requestUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists but on auth route (except callbacks), redirect to dashboard
    if (
      session &&
      isAuthRoute &&
      !requestUrl.pathname.includes("/callback") &&
      !requestUrl.pathname.includes("/accept-invite")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return response
  } catch (e) {
    // If there's an error, log it but still return the original response
    // to avoid the "Cannot read properties of undefined (reading 'headers')" error
    console.error("Auth middleware error:", e)
    return response
  }
}
