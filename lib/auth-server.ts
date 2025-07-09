import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function checkAdminAccess() {
  const supabase = createClient()

  // First try to get the session, then the user
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error("Session error in checkAdminAccess:", sessionError)
    return { hasAccess: false, user: null, error: "Session error" }
  }

  if (!session?.user) {
    return { hasAccess: false, user: null, error: "Not authenticated" }
  }

  const user = session.user

  // Check superadmin table first
  const { data: superAdmin, error: superAdminError } = await supabase
    .from("bot_super_users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!superAdminError && superAdmin) {
    return { hasAccess: true, user, isSuperAdmin: true }
  }

  // Check for 'admin' role in bot_users
  const { data: adminBots, error: adminError } = await supabase
    .from("bot_users")
    .select("role, bot_share_name")
    .eq("user_id", user.id)
    .eq("role", "admin")

  if (!adminError && adminBots && adminBots.length > 0) {
    return { hasAccess: true, user, isSuperAdmin: false, adminBots }
  }

  return { hasAccess: false, user, error: "Insufficient permissions" }
}

export async function checkUserAccess() {
  const supabase = createClient()

  // First try to get the session, then the user
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error("Session error in checkUserAccess:", sessionError)
    return { hasAccess: false, user: null, error: "Session error" }
  }

  if (!session?.user) {
    return { hasAccess: false, user: null, error: "Not authenticated" }
  }

  const user = session.user

  // Check superadmin table first
  const { data: superAdmin, error: superAdminError } = await supabase
    .from("bot_super_users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!superAdminError && superAdmin) {
    return { hasAccess: true, user, isSuperAdmin: true }
  }

  // Check for any role in bot_users (admin or member)
  const { data: userBots, error: userError2 } = await supabase
    .from("bot_users")
    .select("role, bot_share_name")
    .eq("user_id", user.id)

  if (!userError2 && userBots && userBots.length > 0) {
    return { hasAccess: true, user, isSuperAdmin: false, userBots }
  }

  return { hasAccess: false, user, error: "No bot access" }
}

export function requireAuth(hasAccess: boolean, redirectPath = "/dashboard") {
  if (!hasAccess) {
    redirect(redirectPath)
  }
}
