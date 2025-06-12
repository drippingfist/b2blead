import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔍 [API] Reset password API called")
  let email: string | null = null

  try {
    const formData = await request.formData()
    email = formData.get("email") as string

    if (!email) {
      console.log("❌ [API] No email provided")
      return NextResponse.json(
        { success: false, error: "Email is required", message: "Email is required." },
        { status: 400 },
      )
    }

    console.log("📧 [API] Processing reset for email:", email)
    console.log("🌐 [API] Site URL for redirect:", process.env.NEXT_PUBLIC_SITE_URL)
    console.log("🔑 [API] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

    const supabase = createClient()
    console.log("✅ [API] Supabase server client created")

    console.log("📤 [API] Attempting supabase.auth.resetPasswordForEmail...")
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (supabaseError) {
      console.error("❌ [API] Supabase resetPasswordForEmail error:", supabaseError.message)
      console.error("Error Name:", supabaseError.name)
      console.error("Error Status:", supabaseError.status)
      console.error("Error Stack:", supabaseError.stack)
      // Even with a Supabase error, we send a generic success to prevent enumeration
      // but we can include a debug message for ourselves.
      return NextResponse.json(
        {
          success: true, // Important for security
          message: "If an account with that email exists, we've sent a password reset link.",
          debug_error: `Supabase client error: ${supabaseError.message} (Status: ${supabaseError.status})`,
        },
        { status: 200 },
      )
    }

    console.log(
      "✅ [API] Supabase resetPasswordForEmail call successful (no immediate error). Email sending initiated.",
    )
    return NextResponse.json(
      {
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      },
      { status: 200 },
    )
  } catch (e: any) {
    console.error("💥 [API] CRITICAL ERROR in reset-password route:", e.message)
    console.error("Error Type:", typeof e)
    console.error("Error Stack:", e.stack)

    // This is a fallback for unexpected errors.
    // Try to return JSON, but if this itself fails, Next.js might send HTML.
    return NextResponse.json(
      {
        success: false, // Indicate failure here as it's an unexpected server error
        error: "Server error during password reset.",
        message: "An unexpected server error occurred. Please try again later.",
        debug_critical: e.message,
      },
      { status: 500 },
    )
  }
}
