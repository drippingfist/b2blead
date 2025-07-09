import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import DashboardClient from "./dashboard-client"
import Loading from "@/components/loading"

// Server-side function to get user access details (replicates /api/user-bot-access logic)
async function getServerUserBotAccess() {
  const supabase = createClient()

  try {
    // First try to get the session, then the user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error in getServerUserBotAccess:", sessionError)
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    if (!session?.user) {
      console.log("No session found in getServerUserBotAccess")
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    const user = session.user

    const { data: superAdmin, error: superAdminError } = await supabase
      .from("bot_super_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single()

    // Log if there's an error fetching superAdmin, but don't fail if it's just "no rows"
    if (superAdminError && superAdminError.code !== "PGRST116") {
      console.error("Error checking superadmin status:", superAdminError)
    }

    const isSuperAdmin = !!superAdmin
    let accessibleBots: string[] = []
    let highestRole: "superadmin" | "admin" | "member" | null = null

    if (isSuperAdmin) {
      highestRole = "superadmin"
      const { data: allBots, error: allBotsError } = await supabase
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      if (allBotsError) {
        console.error("Error fetching all bots for superadmin:", allBotsError)
      } else {
        accessibleBots = allBots?.map((b: any) => b.bot_share_name).filter(Boolean) || []
      }
    } else {
      const { data: botUsers, error: botUsersError } = await supabase
        .from("bot_users")
        .select("bot_share_name, role")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (botUsersError) {
        console.error("Error fetching bot_users for user:", botUsersError)
      } else if (botUsers && botUsers.length > 0) {
        accessibleBots = [...new Set(botUsers.map((bu: any) => bu.bot_share_name).filter(Boolean))]
        highestRole = botUsers.some((bu: any) => bu.role === "admin") ? "admin" : "member"
      }
    }
    return { role: highestRole, accessibleBots, isSuperAdmin }
  } catch (error) {
    console.error("Error in getServerUserBotAccess:", error)
    return { role: null, accessibleBots: [], isSuperAdmin: false }
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  let userEmail: string | null = null

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error fetching session for email:", sessionError)
    } else if (session?.user) {
      userEmail = session.user.email || null
    }
  } catch (error) {
    console.error("Error in dashboard page session check:", error)
  }

  const userAccess = await getServerUserBotAccess()

  return (
    <Suspense fallback={<Loading message="Loading dashboard..." />}>
      <DashboardClient userAccess={userAccess} userEmail={userEmail} />
    </Suspense>
  )
}
