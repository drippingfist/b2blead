import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error.message)
      // Redirect to login with a generic error
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("error", "Could not authenticate user.")
      return NextResponse.redirect(redirectUrl)
    }
  }

  // URL to redirect to after sign in process completes
  // It will use the 'next' parameter if available (for invites/resets),
  // otherwise it will default to the dashboard.
  const redirectUrl = new URL(next || "/", request.url)
  return NextResponse.redirect(redirectUrl)
}
