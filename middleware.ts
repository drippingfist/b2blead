import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Store the full URL that the user was trying to access
  const requestUrl = new URL(request.url)
  const path = requestUrl.pathname

  // Process the request through Supabase middleware
  const response = await updateSession(request)

  // If the response is a redirect to the login page, add the original path as redirect_to
  if (response && response.headers.get("location")?.includes("/auth/login")) {
    const redirectUrl = new URL(response.headers.get("location") || "", request.url)

    // Only add redirect_to for non-auth paths (to avoid redirect loops)
    if (!path.startsWith("/auth/") && path !== "/") {
      redirectUrl.searchParams.set("redirect_to", path)
      response.headers.set("location", redirectUrl.toString())
    }

    console.log("🔄 Redirecting to login with redirect_to:", path)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
