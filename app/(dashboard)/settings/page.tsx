import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SettingsPageClient from "./settings-page-client"

// This is a server-side function to check access.
async function checkUserIsAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  // Check if user is a superadmin in the dedicated table
  const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()
  if (superAdmin) {
    return true // Superadmins always have access
  }

  // If not superadmin, check if they have an 'admin' role in bot_users
  const { data: adminBots, error } = await supabase
    .from("bot_users")
    .select("role")
    .eq("user_id", user.id) // IMPORTANT: Use the correct 'user_id' column
    .eq("role", "admin")

  if (error) {
    console.error("Error checking admin access:", error)
    return false
  }

  // If they have an 'admin' role for ANY bot, they can access the settings/profile pages.
  return adminBots && adminBots.length > 0
}

export default async function SettingsPage() {
  // 1. Perform the security check on the SERVER.
  const hasAccess = await checkUserIsAdmin()

  // 2. If the user is not authorized, redirect them. This happens on the server.
  // The client never even sees the settings page content.
  if (!hasAccess) {
    redirect("/chats") // Redirect to a safe page like the dashboard or chats
  }

  // 3. If the check passes, render the client component.
  // The client component can now be sure that the user is authorized.
  return <SettingsPageClient />
}
