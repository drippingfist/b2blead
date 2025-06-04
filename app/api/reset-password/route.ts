import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get("email") as string

  if (!email) {
    return NextResponse.redirect(
      new URL(`/auth/forgot-password?error=${encodeURIComponent("Email is required")}`, request.url),
    )
  }

  try {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`,
    })

    if (error) {
      throw error
    }

    return NextResponse.redirect(new URL(`/auth/forgot-password?success=${encodeURIComponent(email)}`, request.url))
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`, request.url),
    )
  }
}
