import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfilePageClient from "./profile-page-client"

// Server-side function to check if user has admin or superadmin access
async function checkProfileAccess() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  // Check if user is a superadmin
  const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()

  if (superAdmin) {
    return true
  }

  // Check if user has admin role for any bot
  const { data: adminBots, error } = await supabase
    .from("bot_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")

  if (error) {
    console.error("Error checking admin access:", error)
    return false
  }

  return adminBots && adminBots.length > 0
}

// Server Component - no hooks allowed here
export default async function ProfilePage() {
  // 1. Perform security check on the server
  const hasAccess = await checkProfileAccess()

  // 2. Redirect if user is not authorized
  if (!hasAccess) {
    redirect("/chats")
  }

  // 3. If access is granted, render the client component
  return <ProfilePageClient />
}
