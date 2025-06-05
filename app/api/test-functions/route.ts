import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    console.log("🧪 Testing SECURITY DEFINER functions...")

    // Test each function individually
    const tests = []

    try {
      const { data, error } = await supabase.rpc("get_current_user_role")
      tests.push({
        function: "get_current_user_role",
        success: !error,
        data,
        error: error?.message || null,
      })
    } catch (e) {
      tests.push({
        function: "get_current_user_role",
        success: false,
        data: null,
        error: e.message,
      })
    }

    try {
      const { data, error } = await supabase.rpc("is_superadmin")
      tests.push({
        function: "is_superadmin",
        success: !error,
        data,
        error: error?.message || null,
      })
    } catch (e) {
      tests.push({
        function: "is_superadmin",
        success: false,
        data: null,
        error: e.message,
      })
    }

    try {
      const { data, error } = await supabase.rpc("get_user_accessible_bots")
      tests.push({
        function: "get_user_accessible_bots",
        success: !error,
        data,
        error: error?.message || null,
      })
    } catch (e) {
      tests.push({
        function: "get_user_accessible_bots",
        success: false,
        data: null,
        error: e.message,
      })
    }

    return NextResponse.json({
      message: "Function test results",
      tests,
      summary: {
        total: tests.length,
        successful: tests.filter((t) => t.success).length,
        failed: tests.filter((t) => !t.success).length,
      },
    })
  } catch (error) {
    console.error("❌ Test functions error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
