// app/api/reset-password/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // 1) Always log that we landed here
  console.log("[API /api/reset-password V4] 👉 POST", request.url);

  // 2) Grab and log env
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl         = process.env.NEXT_PUBLIC_SITE_URL;

  console.log("[API V4] ENV:", {
    SUPA_URL:    supabaseUrl ? "OK" : "MISSING",
    SUPA_ANON:   supabaseAnonKey ? "OK" : "MISSING",
    SITE_URL:    siteUrl ? siteUrl : "MISSING",
  });

  if (!supabaseUrl || !supabaseAnonKey || !siteUrl) {
    console.error("[API V4] Missing critical env vars!");
    return NextResponse.json({
      success: false,
      error:   "Server configuration error.",
    }, { status: 500 });
  }

  // 3) Parse email out of either JSON or form-data
  let email: string | null = null;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json();
      console.log("[API V4] JSON payload:", body);
      email = typeof body.email === "string" ? body.email : null;
    } else {
      const form = await request.formData();
      email = form.get("email") as string;
      console.log("[API V4] formData email:", email);
    }

    if (!email) {
      console.warn("[API V4] No email provided.");
      return NextResponse.json({
        success: false,
        error:   "Email is required.",
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[API V4] Error parsing request body:", err);
    return NextResponse.json({
      success: false,
      error:   "Invalid request body.",
      details: err.message,
    }, { status: 400 });
  }

  // 4) Build Supabase client (server-side)
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
    },
  });
  console.log("[API V4] Supabase client ready.");

  // 5) Send the reset email, pointing straight at your reset page
  const resetLink = `${siteUrl}/auth/reset-password`;
  console.log("[API V4] resetPasswordForEmail redirect_to:", resetLink);

  const { error: supaError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetLink,
  });

  if (supaError) {
    console.error("[API V4] supabase.auth.resetPasswordForEmail error:", supaError);
    // Always return 200 so you don't leak which emails are registered
    return NextResponse.json({
      success: true,
      message: "If that email exists, a reset link has gone out.",
      debug: {
        message: supaError.message,
        name:    supaError.name,
        status:  supaError.status,
      }
    }, { status: 200 });
  }

  console.log(`[API V4] Reset email sent to ${email}`);
  return NextResponse.json({
    success: true,
    message: "If that email exists, a reset link has gone out."
  }, { status: 200 });
}
