import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DemoBotDetailPage from "./demo-bot-detail-page"

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

// Server-side function to fetch a specific bot's details
async function getBotDetails(botShareName: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("bots").select("*").eq("bot_share_name", botShareName).single()

  if (error) {
    console.error(`Error fetching bot details for ${botShareName}:`, error)
    return null
  }

  return data
}

interface PageProps {
  params: {
    bot_share_name: string
  }
}

export default async function DemoBotPage({ params }: PageProps) {
  const isSuperAdmin = await checkSuperAdminAccess()

  if (!isSuperAdmin) {
    redirect("/dashboard")
  }

  const bot = await getBotDetails(params.bot_share_name)

  if (!bot) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Bot not found</h1>
        <p>The bot with share name "{params.bot_share_name}" could not be found.</p>
      </div>
    )
  }

  return <DemoBotDetailPage bot={bot} />
}
