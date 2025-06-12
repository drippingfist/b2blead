import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[API /api/reset-password V5] 👉 POST", request.url)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  console.log("[API V5] ENV:", {
    SUPA_URL: supabaseUrl ? "OK" : "MISSING",
    SUPA_ANON: supabaseAnonKey ? "OK" : "MISSING",
    SITE_URL: siteUrl ? siteUrl : "MISSING",
  })

  if (!supabaseUrl || !supabaseAnonKey || !siteUrl) {
    console.error("[API V5] Missing critical env vars!")
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration error.",
      },
      { status: 500 },
    )
  }

  let email: string | null = null
  try {
    const ct = request.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      const body = await request.json()
      console.log("[API V5] JSON payload:", body)
      email = typeof body.email === "string" ? body.email : null
    } else {
      const form = await request.formData()
      email = form.get("email") as string
      console.log("[API V5] formData email:", email)
    }

    if (!email) {
      console.warn("[API V5] No email provided.")
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 },
      )
    }
  } catch (err: any) {
    console.error("[API V5] Error parsing request body:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        details: err.message,
      },
      { status: 400 },
    )
  }

  // Create Supabase client with proper cookie handling
  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
  console.log("[API V5] Supabase client ready with proper cookie handling.")

  const resetLink = `${siteUrl}/auth/reset-password`
  console.log("[API V5] resetPasswordForEmail redirect_to:", resetLink)

  const { error: supaError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetLink,
  })

  if (supaError) {
    console.error("[API V5] supabase.auth.resetPasswordForEmail error:", supaError)
    return NextResponse.json(
      {
        success: true,
        message: "If that email exists, a reset link has been sent.",
        debug: {
          message: supaError.message,
          name: supaError.name,
          status: supaError.status,
        },
      },
      { status: 200 },
    )
  }

  console.log(`[API V5] Reset email sent to ${email}`)
  return NextResponse.json(
    {
      success: true,
      message: "If that email exists, a reset link has been sent.",
    },
    { status: 200 },
  )
}
