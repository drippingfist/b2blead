import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// This route handles the code exchange for various auth flows (PKCE).
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth confirmation error:", error.message)
      // Redirect to login with a useful error message
      const redirectUrl = new URL("/auth/login", request.url)
      redirectUrl.searchParams.set("error", "The confirmation link is invalid or has expired. Please try again.")
      return NextResponse.redirect(redirectUrl)
    }
  }

  // After the code exchange, Supabase redirects to the redirectTo URL
  // that you specified in your server-side auth call.
  // The auth-helpers library automatically uses the 'next' search param for this.
  const next = requestUrl.searchParams.get("next")
  // For password resets, this will be '/auth/reset-password'
  // For other flows, it will be the appropriate path.
  return NextResponse.redirect(new URL(next || "/", request.url))
}
