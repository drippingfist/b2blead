import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next")

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
        return NextResponse.redirect(new URL("/auth/login?error=Invalid invitation link", request.url))
      }

      console.log("✅ Session created for user:", data.user?.email)

      // CRITICAL: Check if this is a password recovery flow
      if (type === "recovery") {
        console.log("🔑 Password recovery flow detected, redirecting to reset password page")
        // Force redirect to reset password page
        return NextResponse.redirect(new URL("/auth/reset-password?recovery=true", request.url))
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

      // If there's a next parameter, redirect there
      if (next) {
        console.log("➡️ Redirecting to specified next URL:", next)
        return NextResponse.redirect(new URL(next, request.url))
      }

      // Regular login, redirect to dashboard
      console.log("🏠 Regular login, redirecting to dashboard")
      return NextResponse.redirect(new URL("/", request.url))
    } catch (error) {
      console.error("❌ Unexpected error in auth callback:", error)
      return NextResponse.redirect(new URL("/auth/login?error=Authentication failed", request.url))
    }
  }

  // No code provided
  console.log("❌ No auth code provided")
  return NextResponse.redirect(new URL("/auth/login?error=No authentication code", request.url))
}
