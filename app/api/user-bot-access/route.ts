import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get all bots the user has access to
    const { data: botUsers, error: botUsersError } = await supabase
      .from("bot_users")
      .select("bot_share_name, role")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (botUsersError) {
      console.error("Error fetching bot users:", botUsersError)
      return NextResponse.json({ error: "Failed to fetch user bot access" }, { status: 500 })
    }

    // Extract unique bot share names and determine highest role
    const accessibleBots = [...new Set(botUsers?.map((bu) => bu.bot_share_name) || [])]

    // Determine the highest role
    let highestRole: "admin" | "member" | null = null

    if (botUsers && botUsers.length > 0) {
      if (botUsers.some((bu) => bu.role === "admin")) {
        highestRole = "admin"
      } else {
        highestRole = "member"
      }
    }

    return NextResponse.json({
      role: highestRole,
      accessibleBots,
      isSuperAdmin: false, // No longer checking for superadmin
    })
  } catch (error) {
    console.error("Error in user-bot-access API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
