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

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req: request, res })

  // Check if this is an invitation acceptance link
  const requestUrl = new URL(request.url)
  const urlHash = requestUrl.hash
  const isInviteAcceptance = urlHash.includes("type=invite") || requestUrl.searchParams.get("type") === "invite"

  console.log("🔗 Middleware processing:", {
    pathname: requestUrl.pathname,
    isInviteAcceptance,
    hash: urlHash,
    searchParams: Object.fromEntries(requestUrl.searchParams),
  })

  // If this is an invitation acceptance, redirect to callback with setup=true
  if (isInviteAcceptance && requestUrl.pathname === "/auth/login") {
    console.log("📧 Invitation acceptance detected, redirecting to callback")
    const callbackUrl = new URL("/auth/callback", request.url)
    callbackUrl.searchParams.set("setup", "true")
    // Preserve the original hash and search params
    if (requestUrl.searchParams.get("code")) {
      callbackUrl.searchParams.set("code", requestUrl.searchParams.get("code")!)
    }
    return NextResponse.redirect(callbackUrl)
  }

  // Check if this is an auth callback
  const code = requestUrl.searchParams.get("code")

  if (code) {
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code)

    // Check if this should go to setup
    const setup = requestUrl.searchParams.get("setup")
    if (setup === "true") {
      return NextResponse.redirect(new URL("/auth/setup", request.url))
    }

    // Regular callback, redirect to home page
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()

  // Protected routes - redirect to login if not authenticated
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/sign-up") ||
    request.nextUrl.pathname === "/auth/callback" ||
    request.nextUrl.pathname === "/auth/setup"

  if (!isAuthRoute) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const redirectUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}
