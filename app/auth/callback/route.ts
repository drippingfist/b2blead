import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next") // For password reset redirects

  console.log("🔗 Auth callback received:", {
    code: !!code,
    setup,
    type,
    next,
    fullUrl: request.url,
    searchParams: Object.fromEntries(requestUrl.searchParams),
  })

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("❌ Error exchanging code for session:", error)

        // If this is a password reset flow, redirect to reset page with error
        if (next === "/auth/reset-password") {
          return NextResponse.redirect(new URL("/auth/reset-password?error=invalid_link", request.url))
        }

        return NextResponse.redirect(new URL("/auth/login?error=Invalid invitation link", request.url))
      }

      console.log("✅ Session created for user:", data.user?.email)

      // If this is a password reset flow, redirect to reset password page
      if (next === "/auth/reset-password") {
        console.log("🔐 Password reset flow detected, redirecting to reset password page")
        return NextResponse.redirect(new URL("/auth/reset-password", request.url))
      }

      // Check if this is an invitation acceptance
      if (type === "invite" || setup === "true") {
        console.log("📧 Processing invitation acceptance for:", data.user?.email)

        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user!.id)
          .single()

        if (existingProfile) {
          console.log("✅ User already has profile, redirecting to dashboard")
          return NextResponse.redirect(new URL("/", request.url))
        } else {
          console.log("🔧 New user, redirecting to setup")
          return NextResponse.redirect(new URL("/auth/setup", request.url))
        }
      }

      // Regular login, redirect to dashboard
      console.log("🏠 Regular login, redirecting to dashboard")
      return NextResponse.redirect(new URL("/", request.url))
    } catch (error) {
      console.error("❌ Unexpected error in auth callback:", error)
      return NextResponse.redirect(new URL("/auth/login?error=Authentication failed", request.url))
    }
  }

  // No code provided - this might be a password reset flow that will be handled by hash fragments
  console.log("❌ No auth code provided")

  // If this was meant to be a password reset, redirect there anyway
  if (next === "/auth/reset-password") {
    return NextResponse.redirect(new URL("/auth/reset-password", request.url))
  }

  return NextResponse.redirect(new URL("/auth/login?error=No authentication code", request.url))
}
