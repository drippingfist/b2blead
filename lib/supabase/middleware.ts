import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse, type NextRequest } from "next/server"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export async function updateSession(request: NextRequest) {
  // If Supabase is not configured, just continue without auth
  if (!isSupabaseConfigured) {
    return NextResponse.next({
      request,
    })
  }

  const res = NextResponse.next()
  const requestUrl = new URL(request.url)

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req: request, res })

  console.log("🔗 Middleware processing:", {
    pathname: requestUrl.pathname,
    searchParams: Object.fromEntries(requestUrl.searchParams),
  })

  // Check if this is an auth callback with a code
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type")

  if (code && requestUrl.pathname === "/auth/callback") {
    console.log("🔄 Auth callback detected, letting callback route handle it")
    return res
  }

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()

  // Protected routes - redirect to login if not authenticated
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/sign-up") ||
    request.nextUrl.pathname.startsWith("/auth/forgot-password") ||
    request.nextUrl.pathname.startsWith("/auth/reset-password") ||
    request.nextUrl.pathname.startsWith("/auth/set-password") ||
    request.nextUrl.pathname.startsWith("/auth/accept-invite") ||
    request.nextUrl.pathname.startsWith("/auth/setup") ||
    request.nextUrl.pathname.startsWith("/auth/test") ||
    request.nextUrl.pathname === "/auth/callback"

  if (!isAuthRoute) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.log("🔒 No session found, redirecting to login")
      const redirectUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}
