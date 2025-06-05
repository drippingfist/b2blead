import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Create a service role client for admin operations that bypasses RLS
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
      console.log("🔐 API: No authenticated user found")
      return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
    }

    console.log("🔐 API: Getting bot access for user ID:", user.id)

    // Use service role client to bypass RLS
    const serviceClient = getServiceRoleClient()

    // First, check if user is a superadmin (existence of record = superadmin)
    const { data: superUserRecord, error: superUserError } = await serviceClient
      .from("bot_super_users")
      .select("id")
      .eq("id", user.id)
      .single()

    if (superUserError && superUserError.code !== "PGRST116") {
      console.error("❌ API: Error checking superadmin status:", superUserError)
    }

    const isSuperAdmin = !!superUserRecord
    console.log("🔐 API: Is superadmin:", isSuperAdmin)

    if (isSuperAdmin) {
      console.log("🔐 API: User is superadmin - returning full access")
      // Get all bot names for superadmin
      const { data: allBots } = await serviceClient
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      const allBotNames = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []

      return NextResponse.json({
        role: "superadmin",
        accessibleBots: allBotNames,
        isSuperAdmin: true,
      })
    }

    // For regular users, check their bot_users assignments using user_id
    const { data: botUsers, error: botUsersError } = await serviceClient
      .from("bot_users")
      .select("bot_share_name, role")
      .eq("user_id", user.id) // ✅ Fixed: Use user_id instead of id
      .eq("is_active", true)

    if (botUsersError) {
      console.error("❌ API: Error fetching user bot assignments:", botUsersError)
      return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
    }

    console.log("🔐 API: Bot users found:", botUsers)

    if (!botUsers || botUsers.length === 0) {
      console.log("🔐 API: No bot assignments found for user")
      return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
    }

    // Get accessible bot names and determine highest role
    const accessibleBots = botUsers
      .filter((bu) => bu.bot_share_name)
      .map((bu) => bu.bot_share_name)
      .filter(Boolean)

    // Determine the user's highest role (admin > member)
    const hasAdminRole = botUsers.some((bu) => bu.role === "admin")
    const role = hasAdminRole ? "admin" : "member"

    console.log("🔐 API: Final access result:", {
      role,
      accessibleBots,
      isSuperAdmin: false,
    })

    return NextResponse.json({
      role,
      accessibleBots,
      isSuperAdmin: false,
    })
  } catch (error) {
    console.error("❌ API: Exception in user bot access API:", error)
    return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
  }
}
