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

    // Define public routes that don't require authentication
    const publicRoutes = [
      "/auth/login",
      "/auth/sign-up",
      "/auth/forgot-password",
      "/auth/magic-link",
      "/auth/reset-password",
      "/auth/callback",
    ]

    // Get the path from the URL
    const path = new URL(request.url).pathname

    // Special handling for auth callback routes - always allow these
    if (path.includes("/auth/callback")) {
      return response
    }

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.includes(path)
    const isAuthRoute = path.startsWith("/auth/")
    const isApiRoute = path.startsWith("/api/")
    const isRootRoute = path === "/"

    // If no session and trying to access protected route, redirect to login
    if (!session && !isAuthRoute && !isApiRoute && !isRootRoute && !isPublicRoute) {
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("redirect_to", path)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists but on auth route (except callbacks), redirect to dashboard
    if (
      session &&
      isAuthRoute &&
      !path.includes("/callback") &&
      !path.includes("/accept-invite") &&
      !path.includes("/setup")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return response
  } catch (e) {
    // If there's an error, log it but still return the original response
    console.error("Auth middleware error:", e)
    return response
  }
}
