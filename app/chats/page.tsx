import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsPageClient from "./chats-page-client"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get accessible bots for the user
  const { data: bots, error: botsError } = await supabase
    .from("bots")
    .select("*")
    .order("bot_share_name", { ascending: true })

  if (botsError) {
    console.error("Error fetching bots:", botsError)
  }

  return <ChatsPageClient bots={bots || []} />
}
