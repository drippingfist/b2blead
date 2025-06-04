import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Send password reset email - Supabase will handle whether user exists or not
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) {
      console.error("Password reset error:", error)
      // Don't expose the actual error to the user for security
    }

    // Always return success to prevent user enumeration
    // Supabase won't send an email if the user doesn't exist, but we don't tell the client that
    return NextResponse.json(
      {
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("Password reset error:", error)
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
