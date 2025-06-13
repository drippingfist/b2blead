import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  try {
    // Process the request through Supabase middleware
    const response = await updateSession(request)

    // Get the pathname
    const pathname = new URL(request.url).pathname

    // If this is a dashboard route, we need to ensure authentication
    if (
      pathname.startsWith("/(dashboard)") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/chats") ||
      pathname.startsWith("/messages") ||
      pathname.startsWith("/callbacks") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/superadmin") ||
      pathname.startsWith("/thread")
    ) {
      // Check if the user is authenticated from the response
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasAuthCookie = request.cookies.has(`sb-${supabaseUrl}-auth-token`)

      if (!hasAuthCookie) {
        // User is not authenticated, redirect to login
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }
    }

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
