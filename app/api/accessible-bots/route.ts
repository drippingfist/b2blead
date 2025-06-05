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
      console.log("🤖 API: No authenticated user found")
      return NextResponse.json([])
    }

    console.log("🤖 API: Getting accessible bots for user ID:", user.id)

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
    console.log("🤖 API: Is superadmin:", isSuperAdmin)

    let accessibleBotNames: string[] = []

    if (isSuperAdmin) {
      console.log("🤖 API: User is superadmin - getting all bots")
      // Superadmin gets all bots
      const { data: allBots } = await serviceClient
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      accessibleBotNames = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
    } else {
      // Regular users get their assigned bots from bot_users using user_id and bot_share_name
      const { data: botUsers, error: botUsersError } = await serviceClient
        .from("bot_users")
        .select("bot_share_name")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (botUsersError) {
        console.error("❌ API: Error fetching user bot assignments:", botUsersError)
        return NextResponse.json([])
      }

      accessibleBotNames =
        botUsers
          ?.filter((bu) => bu.bot_share_name)
          .map((bu) => bu.bot_share_name)
          .filter(Boolean) || []
    }

    console.log("🤖 API: Accessible bot names:", accessibleBotNames)

    if (accessibleBotNames.length === 0) {
      return NextResponse.json([])
    }

    // Get full bot details for accessible bots
    const { data: bots, error: botsError } = await serviceClient
      .from("bots")
      .select("*")
      .in("bot_share_name", accessibleBotNames)
      .order("client_name", { ascending: true })

    if (botsError) {
      console.error("❌ API: Error fetching bot details:", botsError)
      return NextResponse.json([])
    }

    console.log("🤖 API: Successfully fetched", bots?.length || 0, "accessible bots")
    return NextResponse.json(bots || [])
  } catch (error) {
    console.error("❌ API: Exception in accessible bots API:", error)
    return NextResponse.json([])
  }
}
