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

    console.log("🔐 API: Getting user bot access for user ID:", user.id)

    // Use service role client to bypass RLS
    const serviceClient = getServiceRoleClient()

    // First, check if user is a superadmin (existence of record = superadmin)
    const { data: superUserRecord, error: superUserError } = await serviceClient
      .from("bot_super_users")
      .select("id")
      .eq("id", user.id)
      .single()

    if (superUserError && superUserError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for non-superadmins
      console.error("❌ API: Error checking superadmin status:", superUserError)
    }

    const isSuperAdmin = !!superUserRecord
    console.log("🔐 API: Is superadmin:", isSuperAdmin)

    if (isSuperAdmin) {
      console.log("🔐 API: User is superadmin - getting all bots")
      // Superadmin can see all bots
      const { data: allBots } = await serviceClient
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      const accessibleBots = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
      return NextResponse.json({ role: "superadmin", accessibleBots, isSuperAdmin: true })
    }

    // Not a superadmin, check regular bot_users table using user_id
    const { data: botUsers, error: botUsersError } = await serviceClient
      .from("bot_users")
      .select("role, bot_share_name")
      .eq("user_id", user.id) // Changed from "id" to "user_id"
      .eq("is_active", true)

    if (botUsersError) {
      console.error("❌ API: Error fetching user bot access:", botUsersError)
      return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
    }

    console.log("🔐 API: Bot users query result:", botUsers)

    if (!botUsers || botUsers.length === 0) {
      console.log("🔐 API: No bot access found for user")
      return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
    }

    // Get the user's highest role (admin or member)
    const isAdmin = botUsers.some((bu) => bu.role === "admin")
    const userRole = isAdmin ? "admin" : "member"

    // Get their specific bot assignments (can be multiple)
    const accessibleBots = botUsers
      .filter((bu) => bu.bot_share_name)
      .map((bu) => bu.bot_share_name)
      .filter(Boolean)

    console.log(`🔐 API: User is ${userRole} with access to bots:`, accessibleBots)

    return NextResponse.json({
      role: userRole,
      accessibleBots,
      isSuperAdmin: false,
    })
  } catch (error) {
    console.error("❌ API: Exception in user bot access API:", error)
    return NextResponse.json({ role: null, accessibleBots: [], isSuperAdmin: false })
  }
}
