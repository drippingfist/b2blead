import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Create a service role client
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET() {
  try {
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: "No authenticated user found" })
    }

    const serviceClient = getServiceRoleClient()
    const results: any = {
      userId: user.id,
      tests: {},
    }

    // Test 1: Check if functions exist in the database
    console.log("🧪 Testing function existence...")
    const { data: functions, error: functionsError } = await serviceClient
      .from("pg_proc")
      .select("proname")
      .in("proname", ["get_current_user_role", "is_superadmin", "get_user_accessible_bots"])

    results.tests.functionsExist = {
      success: !functionsError,
      error: functionsError?.message,
      functions: functions?.map((f) => f.proname) || [],
    }

    // Test 2: Try calling get_current_user_role
    console.log("🧪 Testing get_current_user_role...")
    try {
      const { data: roleData, error: roleError } = await serviceClient.rpc("get_current_user_role")
      results.tests.getCurrentUserRole = {
        success: !roleError,
        data: roleData,
        error: roleError?.message,
      }
    } catch (e: any) {
      results.tests.getCurrentUserRole = {
        success: false,
        error: e.message,
      }
    }

    // Test 3: Try calling is_superadmin
    console.log("🧪 Testing is_superadmin...")
    try {
      const { data: superAdminData, error: superAdminError } = await serviceClient.rpc("is_superadmin")
      results.tests.isSuperadmin = {
        success: !superAdminError,
        data: superAdminData,
        error: superAdminError?.message,
      }
    } catch (e: any) {
      results.tests.isSuperadmin = {
        success: false,
        error: e.message,
      }
    }

    // Test 4: Try calling get_user_accessible_bots
    console.log("🧪 Testing get_user_accessible_bots...")
    try {
      const { data: botsData, error: botsError } = await serviceClient.rpc("get_user_accessible_bots")
      results.tests.getUserAccessibleBots = {
        success: !botsError,
        data: botsData,
        error: botsError?.message,
      }
    } catch (e: any) {
      results.tests.getUserAccessibleBots = {
        success: false,
        error: e.message,
      }
    }

    // Test 5: Direct query to bot_users as fallback
    console.log("🧪 Testing direct bot_users query...")
    try {
      const { data: botUsers, error: botUsersError } = await serviceClient
        .from("bot_users")
        .select("role, bot_share_name")
        .eq("id", user.id)
        .eq("is_active", true)

      results.tests.directBotUsersQuery = {
        success: !botUsersError,
        data: botUsers,
        error: botUsersError?.message,
      }
    } catch (e: any) {
      results.tests.directBotUsersQuery = {
        success: false,
        error: e.message,
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("❌ Test API error:", error)
    return NextResponse.json({ error: error.message })
  }
}
