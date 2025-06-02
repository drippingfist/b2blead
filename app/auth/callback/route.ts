import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const setup = requestUrl.searchParams.get("setup")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(new URL("/auth/login?error=Invalid invitation link", request.url))
    }

    if (data.user && setup === "true") {
      // This is a new user from an invitation, set up their profile
      try {
        const userMetadata = data.user.user_metadata

        if (userMetadata.bot_share_name) {
          // Create user profile from invitation metadata
          const { error: profileError } = await supabase.from("user_profiles").upsert({
            id: data.user.id,
            first_name: userMetadata.first_name || "",
            surname: userMetadata.surname || "",
            timezone: userMetadata.timezone || "Asia/Bangkok",
            bot_share_name: userMetadata.bot_share_name,
          })

          if (profileError) {
            console.error("Error creating user profile:", profileError)
          }

          // Create bot_users entry
          const { error: botUserError } = await supabase.from("bot_users").upsert({
            id: data.user.id,
            role: userMetadata.role || "member",
            bot_share_name: userMetadata.bot_share_name,
            is_active: true,
          })

          if (botUserError) {
            console.error("Error creating bot user:", botUserError)
          }

          // Remove the invitation record if it exists
          await supabase.from("user_invitations").delete().eq("email", data.user.email)
        }
      } catch (error) {
        console.error("Error setting up invited user:", error)
      }
    }
  }

  // Redirect to the dashboard
  return NextResponse.redirect(new URL("/", request.url))
}
