import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminPageClient from "./admin-page-client"

// Server-side function to check admin access
async function checkAdminAccess() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { hasAccess: false, user: null, isSuperAdmin: false }
  }

  // Check if user is a superadmin
  const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).maybeSingle()

  if (superAdmin) {
    return { hasAccess: true, user, isSuperAdmin: true }
  }

  // Check if user has admin role for any bot
  const { data: adminBots } = await supabase.from("bot_users").select("role").eq("user_id", user.id).eq("role", "admin")

  const hasAdminAccess = adminBots && adminBots.length > 0
  return { hasAccess: hasAdminAccess, user, isSuperAdmin: false }
}

export default async function AdminPage() {
  const { hasAccess, user, isSuperAdmin } = await checkAdminAccess()

  // Redirect if no access
  if (!hasAccess || !user) {
    redirect("/dashboard")
  }

  // Get user profile data
  const supabase = createClient()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name, surname")
    .eq("id", user.id)
    .single()

  const initialUserData = {
    id: user.id,
    email: user.email || "",
    firstName: profile?.first_name || "",
    surname: profile?.surname || "",
  }

  return <AdminPageClient initialUserData={initialUserData} isSuperAdmin={isSuperAdmin} />
}
