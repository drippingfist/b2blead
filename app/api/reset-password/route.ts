import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[API /api/reset-password V3] Received request.")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  console.log(`[API V3] SUPABASE_URL: ${supabaseUrl}`)
  console.log(`[API V3] SUPABASE_ANON_KEY: ${supabaseAnonKey ? "Exists" : "MISSING!"}`)
  console.log(`[API V3] SITE_URL: ${siteUrl}`)

  if (!supabaseUrl || !supabaseAnonKey || !siteUrl) {
    console.error("[API V3] Missing critical environment variables.")
    return NextResponse.json(
      { success: false, error: "Server configuration error.", message: "Server configuration error." },
      { status: 500 },
    )
  }

  let email: string | null = null
  try {
    const formData = await request.formData()
    email = formData.get("email") as string

    if (!email) {
      console.log("[API V3] Email not provided in form data.")
      return NextResponse.json(
        { success: false, error: "Email is required.", message: "Email is required." },
        { status: 400 },
      )
    }
    console.log(`[API V3] Attempting password reset for: ${email}`)

    // Create a Supabase client instance directly for this request
    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
    console.log("[API V3] Supabase client instance created for reset.")

    // Use the callback approach since we've fixed the callback route
    const redirectTo = `${siteUrl}/auth/callback?next=/auth/reset-password`
    console.log(`[API V3] Redirect URL for Supabase: ${redirectTo}`)

    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    })

    if (supabaseError) {
      console.error(`[API V3] Supabase resetPasswordForEmail error: ${supabaseError.message}`, supabaseError)
      return NextResponse.json(
        {
          success: true, // For security, don't reveal if email exists
          message: "If an account with that email exists, we've sent a password reset link.",
          debug_error_message: supabaseError.message,
          debug_error_name: supabaseError.name,
          debug_error_status: supabaseError.status,
        },
        { status: 200 },
      )
    }

    console.log(`[API V3] Supabase resetPasswordForEmail call successful for ${email}.`)
    return NextResponse.json(
      { success: true, message: "If an account with that email exists, we've sent a password reset link." },
      { status: 200 },
    )
  } catch (e: any) {
    console.error(`[API V3] UNEXPECTED CRITICAL ERROR for email ${email}: ${e.message}`, e)
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
        message: "An unexpected server error occurred.",
        debug_critical: e.message,
      },
      { status: 500 },
    )
  }
}
