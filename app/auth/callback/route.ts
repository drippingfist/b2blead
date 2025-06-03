import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")

  // Check if this is an invitation acceptance (from URL hash)
  const urlHash = requestUrl.hash
  const isInviteAcceptance = urlHash.includes("type=invite")
  const isPasswordReset = urlHash.includes("type=recovery")

  console.log("🔗 Auth callback received:", {
    code,
    setup,
    isInviteAcceptance,
    isPasswordReset,
    fullUrl: request.url,
    hash: urlHash,
  })

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(new URL("/auth/login?error=Invalid link", request.url))
    }

    if (data.user && setup === "true") {
      // This is a new user from an invitation, redirect to setup page
      console.log("🔧 Redirecting new user to setup page")
      return NextResponse.redirect(new URL("/auth/setup", request.url))
    }
  }

  // Handle invitation acceptance from URL hash parameters
  if (isInviteAcceptance) {
    console.log("📧 Processing invitation acceptance")
    return NextResponse.redirect(new URL("/auth/setup", request.url))
  }

  // Handle password reset - redirect to login page with hash intact
  if (isPasswordReset) {
    console.log("🔐 Processing password reset - redirecting to login with hash")
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.hash = requestUrl.hash
    return NextResponse.redirect(loginUrl)
  }

  // Regular callback, redirect to dashboard
  console.log("🏠 Regular callback, redirecting to dashboard")
  return NextResponse.redirect(new URL("/", request.url))
}
