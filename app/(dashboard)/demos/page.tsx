import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DemosPageClient from "./demos-page-client"

// Server-side function to check for superadmin access
async function checkSuperAdminAccess() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: isSuperAdmin, error } = await supabase.rpc("is_superadmin")

  if (error) {
    console.error("Error checking superadmin status:", error)
    return false
  }

  return isSuperAdmin === true
}

// Server-side function to fetch demo bots
async function getDemoBots() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bots")
    .select("id, bot_share_name, client_name, created_at, demo_expiry_date")
    .eq("demo", true)
    .order("client_name", { ascending: true })

  if (error) {
    console.error("Error fetching demo bots:", error)
    return []
  }

  return data
}

export default async function DemosPage() {
  const isSuperAdmin = await checkSuperAdminAccess()

  if (!isSuperAdmin) {
    redirect("/dashboard")
  }

  const demoBots = await getDemoBots()

  return <DemosPageClient bots={demoBots} />
}
