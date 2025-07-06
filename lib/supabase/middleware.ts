import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

import type { NextRequest } from "next/request"

// This is the function that your root middleware.ts uses.
// We are keeping this and removing the other one.
export async function updateSession(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/auth/login") ||
    req.nextUrl.pathname.startsWith("/auth/signup") ||
    req.nextUrl.pathname.startsWith("/auth/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth/magic-link") ||
    req.nextUrl.pathname.startsWith("/auth/reset-password") ||
    req.nextUrl.pathname.startsWith("/auth/set-password") ||
    req.nextUrl.pathname.startsWith("/auth/accept-invite") ||
    req.nextUrl.pathname.startsWith("/auth/setup") ||
    req.nextUrl.pathname.startsWith("/auth/test") ||
    req.nextUrl.pathname === "/auth/callback"

  if (!session && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    redirectUrl.searchParams.set(`redirect_to`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}
