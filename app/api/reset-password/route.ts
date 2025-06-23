import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Initialize Supabase client with server-side helper
    const supabase = createClient()

    // Send password reset email using Supabase auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) {
      console.error("Password reset failed for a user.", {
        error_message: error.message,
        error_status: (error as any).status,
      })
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
    console.error("Critical exception in password reset endpoint.", {
      error_message: error.message,
    })
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
