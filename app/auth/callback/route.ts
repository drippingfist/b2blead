import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")
  const type = requestUrl.searchParams.get("type")
  // Get the redirect_to parameter if it exists
  const redirectTo = requestUrl.searchParams.get("redirect_to")

  console.log("🔗 Auth callback received:", {
    code: !!code,
    setup,
    type,
    redirectTo,
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

      // If we have a redirect_to parameter, use it
      if (redirectTo) {
        console.log("🔄 Redirecting to original URL:", redirectTo)
        return NextResponse.redirect(new URL(redirectTo, request.url))
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
