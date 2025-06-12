import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Reset password API called")

    const formData = await request.formData()
    const email = formData.get("email") as string

    if (!email) {
      console.log("❌ No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("📧 Processing reset for email:", email)
    console.log("🌐 Site URL:", process.env.NEXT_PUBLIC_SITE_URL)
    console.log("🔑 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

    // Initialize Supabase client with server-side helper
    const supabase = createClient()
    console.log("✅ Supabase client created")

    // Send password reset email using Supabase auth
    console.log("📤 Attempting to send reset email...")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) {
      console.error("❌ Password reset error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      // Don't expose the actual error to the user for security
    } else {
      console.log("✅ Password reset email sent successfully")
    }

    // Always return success to prevent user enumeration
    return NextResponse.json(
      {
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("💥 Password reset error:", error)
    console.error("Error stack:", error.stack)
    // Always return success to prevent user enumeration
    return NextResponse.json(
      {
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      },
      { status: 200 },
    )
  }
}
