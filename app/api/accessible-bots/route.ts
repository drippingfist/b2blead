import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    // This client operates within the user's security context
    const supabase = createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      console.log("🤖 API: No authenticated user found for accessible-bots")
      return NextResponse.json({ bots: [], error: "Not authenticated" }, { status: 401 })
    }

    console.log("🤖 API: Getting accessible bots (user context) for user ID:", user.id)

    // 1. Determine which bot_share_names the user can access
    let accessibleBotShareNames: string[] = []

    // Check if user is a superadmin (using user-context client)
    const { data: superAdminRecord, error: superAdminErr } = await supabase
      .from("bot_super_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single()

    const isSuperAdmin = !!superAdminRecord && !superAdminErr

    if (isSuperAdmin) {
      console.log("🤖 API: User is superadmin - getting all bot_share_names")
      const { data: allBots, error: botsError } = await supabase
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      if (botsError) {
        console.error("❌ API: Error fetching all bot_share_names for superadmin:", botsError)
        return NextResponse.json({ bots: [], error: "Failed to fetch bot list" }, { status: 500 })
      }
      accessibleBotShareNames = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
    } else {
      console.log("🤖 API: User is not superadmin - getting assigned bot_share_names")
      const { data: userBotAssignments, error: assignmentsError } = await supabase
        .from("bot_users")
        .select("bot_share_name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .not("bot_share_name", "is", null)

      if (assignmentsError) {
        console.error("❌ API: Error fetching user bot assignments:", assignmentsError)
        return NextResponse.json({ bots: [], error: "Failed to fetch user bot access" }, { status: 500 })
      }
      accessibleBotShareNames = userBotAssignments?.map((bu) => bu.bot_share_name).filter(Boolean) || []
    }

    if (accessibleBotShareNames.length === 0) {
      console.log("🤖 API: No accessible bots found for user.")
      return NextResponse.json([]) // Return empty array for consistency
    }

    console.log("🤖 API: User has access to bot_share_names:", accessibleBotShareNames)

    // 2. Fetch full bot details for these accessible bot_share_names
    // RLS on the 'bots' table allows authenticated users to SELECT all bots
    const { data: bots, error: botsDetailsError } = await supabase
      .from("bots")
      .select("*")
      .in("bot_share_name", accessibleBotShareNames)
      .order("client_name", { ascending: true })

    if (botsDetailsError) {
      console.error("❌ API: Error fetching bot details:", botsDetailsError)
      return NextResponse.json({ bots: [], error: "Failed to retrieve bot details" }, { status: 500 })
    }

    console.log("🤖 API: Successfully fetched", bots?.length || 0, "full bot details.")
    return NextResponse.json(bots || [])
  } catch (error: any) {
    console.error("❌ API: Exception in accessible-bots API:", error)
    return NextResponse.json({ bots: [], error: "Internal server error: " + error.message }, { status: 500 })
  }
}
