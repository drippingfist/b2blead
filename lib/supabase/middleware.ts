import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

import type { NextRequest } from "next/request"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}

export async function updateSession(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const publicRoutes = [
    "/auth/login",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/auth/magic-link",
    "/auth/accept-invite", // ✅ Added this to public routes
  ]

  if (!session && !publicRoutes.includes(req.nextUrl.pathname)) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/auth/login"
    redirectUrl.searchParams.set(`redirect_to`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/auth/login") ||
    req.nextUrl.pathname.startsWith("/auth/sign-up") ||
    req.nextUrl.pathname.startsWith("/auth/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth/magic-link") ||
    req.nextUrl.pathname.startsWith("/auth/reset-password") ||
    req.nextUrl.pathname.startsWith("/auth/set-password") ||
    req.nextUrl.pathname.startsWith("/auth/accept-invite") || // ✅ Keep this as auth route
    req.nextUrl.pathname.startsWith("/auth/setup") ||
    req.nextUrl.pathname.startsWith("/auth/test") ||
    req.nextUrl.pathname === "/auth/callback"

  return res
}
