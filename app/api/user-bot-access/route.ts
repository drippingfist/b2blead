import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // First try to get the session, then the user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error(`[API /user-bot-access] Session error:`, sessionError)
      return NextResponse.json({ error: "Session error" }, { status: 401 })
    }

    if (!session?.user) {
      console.log(`[API /user-bot-access] No session found`)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = session.user
    console.log(`[API /user-bot-access] User ID: ${user.id}, Email: ${user.email}`)

    // Call the SQL function to check superadmin status
    // The is_superadmin() function already checks for is_active = true
    const { data: isSuperAdmin, error: rpcError } = await supabase.rpc("is_superadmin") // This function uses auth.uid() internally

    if (rpcError) {
      console.error(`[API /user-bot-access] Error calling is_superadmin RPC for ${user.id}:`, rpcError)
      // Decide how to handle RPC errors; for now, assume not superadmin
      return NextResponse.json({ error: "Failed to determine superadmin status" }, { status: 500 })
    }

    console.log(`[API /user-bot-access] Result from is_superadmin RPC for ${user.id}: ${isSuperAdmin}`)
    console.log(`[API /user-bot-access] Determined isSuperAdmin via RPC for ${user.id}: ${isSuperAdmin}`)

    let accessibleBots: string[] = []
    let highestRole: "superadmin" | "admin" | "member" | null = null

    if (isSuperAdmin === true) {
      // RPC returns boolean
      highestRole = "superadmin"
      console.log(`[API /user-bot-access] User ${user.id} IS superadmin (via RPC), fetching all bots`)
      const { data: allBots, error: allBotsError } = await supabase
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      if (allBotsError) {
        console.error("[API /user-bot-access] Error fetching all bots for superadmin:", allBotsError)
      } else {
        accessibleBots = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
      }
    } else {
      console.log(`[API /user-bot-access] User ${user.id} is NOT superadmin (via RPC), checking bot_users table`)
      const { data: botUsers, error: botUsersError } = await supabase
        .from("bot_users")
        .select("bot_share_name, role")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (botUsersError) {
        console.error("[API /user-bot-access] Error fetching bot users:", botUsersError)
        return NextResponse.json({ error: "Failed to fetch user bot access" }, { status: 500 })
      }

      if (botUsers && botUsers.length > 0) {
        console.log(`[API /user-bot-access] bot_users query result for ${user.id}:`, botUsers)
        accessibleBots = [...new Set(botUsers.map((bu) => bu.bot_share_name).filter(Boolean))]
        highestRole = botUsers.some((bu) => bu.role === "admin") ? "admin" : "member"
        console.log(`[API /user-bot-access] Regular user ${user.id} role determined as: ${highestRole}`)
      } else {
        console.log(`[API /user-bot-access] No bot_users records found for ${user.id}`)
      }
    }

    const finalResult = {
      role: highestRole,
      accessibleBots,
      isSuperAdmin: isSuperAdmin === true, // Ensure it's a boolean
    }

    console.log(
      `[API /user-bot-access] Final result for ${user.id}: role=${finalResult.role}, isSuperAdmin=${finalResult.isSuperAdmin}, accessibleBots=${accessibleBots.length} bots`,
    )

    return NextResponse.json(finalResult)
  } catch (error) {
    console.error("Error in user-bot-access API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
