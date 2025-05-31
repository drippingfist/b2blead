import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsList from "./chats-list"
import { ChatsHeader } from "./chats-header"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user's email
  const userEmail = session.user.email

  // Get bots the user has access to
  const { data: userBots } = await supabase
    .from("bot_users")
    .select("bot_share_name")
    .eq("user_email", userEmail)
    .eq("is_active", true)

  if (!userBots || userBots.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Chats</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
          You don't have access to any bots yet. Please contact an administrator.
        </div>
      </div>
    )
  }

  // Get bot share names the user has access to
  const botShareNames = userBots.map((bot) => bot.bot_share_name)

  // Get threads for these bots
  const { data: threads, error } = await supabase
    .from("threads")
    .select(`
      id,
      created_at,
      bot_share_name,
      thread_id,
      updated_at,
      duration,
      message_preview,
      sentiment_score,
      cb_requested,
      bots(client_name)
    `)
    .in("bot_share_name", botShareNames)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching threads:", error)
  }

  return (
    <div className="container mx-auto p-4">
      <ChatsHeader />
      <ChatsList threads={threads || []} />
    </div>
  )
}
