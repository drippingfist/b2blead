import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if the user is a superadmin
    const { data: superAdmin, error: superAdminError } = await supabase
      .from("bot_super_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle() // Use maybeSingle() to prevent error on 0 rows

    // Log any unexpected errors, but continue
    if (superAdminError) {
      console.error("Error checking superadmin status:", superAdminError)
    }

    const isSuperAdmin = !!superAdmin

    let accessibleBots: string[] = []
    let highestRole: "superadmin" | "admin" | "member" | null = null

    if (isSuperAdmin) {
      highestRole = "superadmin"
      // Superadmins can access all bots
      const { data: allBots, error: allBotsError } = await supabase
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      if (allBotsError) {
        console.error("Error fetching all bots for superadmin:", allBotsError)
      } else {
        accessibleBots = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
      }
    } else {
      // Regular users get their assigned bots from bot_users
      const { data: botUsers, error: botUsersError } = await supabase
        .from("bot_users")
        .select("bot_share_name, role")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (botUsersError) {
        console.error("Error fetching bot users:", botUsersError)
        return NextResponse.json({ error: "Failed to fetch user bot access" }, { status: 500 })
      }

      if (botUsers && botUsers.length > 0) {
        accessibleBots = [...new Set(botUsers.map((bu) => bu.bot_share_name).filter(Boolean))]
        highestRole = botUsers.some((bu) => bu.role === "admin") ? "admin" : "member"
      }
    }

    return NextResponse.json({
      role: highestRole,
      accessibleBots,
      isSuperAdmin,
    })
  } catch (error) {
    console.error("Error in user-bot-access API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
