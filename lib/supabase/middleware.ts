import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/magic-link",
    "/auth/accept-invite",
    "/auth/set-password",
    "/auth/callback",
  ]

  // Allow all API routes
  if (pathname.startsWith("/api/")) {
    return response
  }

  // If the user is not signed in and the path is not public, redirect to login
  if (!user && !publicPaths.some((path) => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirect_to", pathname)
    return NextResponse.redirect(url)
  }

  // If user is signed in and tries to access a public auth page, redirect to dashboard
  if (user && (pathname === "/auth/login" || pathname === "/auth/sign-up")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
