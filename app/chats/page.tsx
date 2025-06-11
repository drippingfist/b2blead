import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsPageClient from "./chats-page-client"
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

  // Get user's email and ID for debugging
  const userEmail = session.user.email
  const userId = session.user.id

  console.log("🔍 CHATS DEBUG: User email:", userEmail)
  console.log("🔍 CHATS DEBUG: User ID:", userId)

  // Check if user is superadmin - check if their ID exists in bot_super_users table
  console.log("🔍 CHATS DEBUG: Checking superadmin status...")
  const { data: superAdminCheck, error: superAdminError } = await supabase
    .from("bot_super_users")
    .select("id")
    .eq("id", userId) // Check if the user's ID exists as a record
    .single()

  console.log("🔍 CHATS DEBUG: Superadmin query error:", superAdminError)
  console.log("🔍 CHATS DEBUG: Superadmin query data:", superAdminCheck)

  const isSuperAdmin = !!superAdminCheck
  console.log("🔍 CHATS DEBUG: Is superadmin:", isSuperAdmin)

  // Also check what's in the bot_super_users table
  const { data: allSuperAdmins, error: allSuperAdminsError } = await supabase.from("bot_super_users").select("*")

  console.log("🔍 CHATS DEBUG: All superadmins:", allSuperAdmins)
  console.log("🔍 CHATS DEBUG: All superadmins error:", allSuperAdminsError)

  // Get bots the user has access to using user_id (not email)
  const { data: userBots, error: userBotsError } = await supabase
    .from("bot_users")
    .select("bot_share_name")
    .eq("user_id", userId)
    .eq("is_active", true)

  console.log("🔍 CHATS DEBUG: bot_users query error:", userBotsError)
  console.log("🔍 CHATS DEBUG: bot_users data:", userBots)

  if (!userBots || userBots.length === 0) {
    console.log("🔍 CHATS DEBUG: No bot access found")
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Chats</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
          You don't have access to any bots yet. Please contact an administrator.
          <div className="mt-2 text-xs">
            Debug: User ID: {userId}, Email: {userEmail}, SuperAdmin: {isSuperAdmin.toString()}
          </div>
        </div>
      </div>
    )
  }

  // Get bot share names the user has access to
  const botShareNames = userBots.map((bot) => bot.bot_share_name)
  console.log("🔍 CHATS DEBUG: Accessible bot share names:", botShareNames)

  // Get total count of threads for these bots (without limit)
  const { count: totalThreadsCount, error: countError } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botShareNames)
    .gt("count", 0)

  console.log("🔍 CHATS DEBUG: total threads count:", totalThreadsCount)
  console.log("🔍 CHATS DEBUG: count query error:", countError)

  // Get threads for these bots (with limit for display)
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
    count,
    bots(client_name)
  `)
    .in("bot_share_name", botShareNames)
    .gt("count", 0)
    .order("updated_at", { ascending: false })
    .limit(50)

  console.log("🔍 CHATS DEBUG: threads query error:", error)
  console.log("🔍 CHATS DEBUG: threads data:", threads)
  console.log("🔍 CHATS DEBUG: threads count:", threads?.length || 0)

  if (error) {
    console.error("Error fetching threads:", error)
  }

  return (
    <div className="container mx-auto p-4">
      <ChatsHeader />
      <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
        <strong>Debug Info:</strong>
        <br />
        User ID: {userId}
        <br />
        Bot Access: {botShareNames.join(", ")}
        <br />
        Threads Found: {threads?.length || 0}
        <br />
        SuperAdmin: {isSuperAdmin.toString()}
        <br />
        SuperAdmin Check Error: {superAdminError?.message || "none"}
        <br />
        SuperAdmin Data: {JSON.stringify(superAdminCheck)}
      </div>
      <ChatsPageClient threads={threads || []} isSuperAdmin={isSuperAdmin} totalCount={totalThreadsCount || 0} />
    </div>
  )
}
