import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import ChatsPageClient from "./chats-page-client"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  // Fetch all accessible bots
  const { data: bots, error: botsError } = await supabase.from("bot_users").select("*")

  if (botsError) {
    console.error("Error fetching bots:", botsError)
    return <div>Error loading bots. Please try again later.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ChatsPageClient bots={bots || []} />
    </div>
  )
}
