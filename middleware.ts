import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  try {
    // Process the request through Supabase middleware
    const response = await updateSession(request)

    // If the response is a redirect, we don't need to modify it further
    if (response.headers.get("location")) {
      return response
    }

    // Store the full URL that the user was trying to access
    const requestUrl = new URL(request.url)
    const path = requestUrl.pathname

    // If we're not redirecting, just return the response
    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // Return a basic response to avoid crashing
    return new Response("Internal Server Error", { status: 500 })
  }
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
