import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")
  const type = requestUrl.searchParams.get("type")

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

      // Check if this is an invitation acceptance
      if (type === "invite" || setup === "true") {
        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user!.id)
          .single()

        if (existingProfile) {
          return NextResponse.redirect(new URL("/", request.url))
        } else {
          return NextResponse.redirect(new URL("/auth/setup", request.url))
        }
      }

      // Regular login, redirect to dashboard
      return NextResponse.redirect(new URL("/", request.url))
    } catch (error) {
      console.error("❌ Unexpected error in auth callback:", error)
      return NextResponse.redirect(new URL("/auth/login?error=Authentication failed", request.url))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL("/auth/login?error=No authentication code", request.url))
}
