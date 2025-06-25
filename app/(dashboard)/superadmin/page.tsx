import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SuperAdminClient from "./superadmin-client"

async function checkSuperAdminAccess() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  // Check the bot_super_users table
  const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).maybeSingle()

  return !!superAdmin
}

export default async function SuperAdminPage() {
  const isSuperAdmin = await checkSuperAdminAccess()

  if (!isSuperAdmin) {
    redirect("/dashboard")
  }

  // If check passes, render the client component
  return <SuperAdminClient />
}
