import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsPageClient from "./chats-page-client"
import { calculateDateRangeForQuery } from "@/lib/time-utils"
import { getTimezoneAbbreviation } from "@/lib/timezone-utils"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const userId = session.user.id
  const { data: superAdminCheck } = await supabase.from("bot_super_users").select("id").eq("id", userId).single()
  const isSuperAdmin = !!superAdminCheck

  const { data: userBots, error: userBotsError } = await supabase
    .from("bot_users")
    .select("bot_share_name")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (!userBots || userBots.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">No Access</h1>
          <p className="text-gray-600">You don't have access to any bots.</p>
        </div>
      </div>
    )
  }

  const botShareNames = userBots.map((bot) => bot.bot_share_name)
  const defaultTimePeriodValue = "all"
  const { startDate: defaultStartDate, endDate: defaultEndDate } = calculateDateRangeForQuery(defaultTimePeriodValue)

  // Get total count of threads for accessible bots and default time period
  let totalCountQuery = supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .in("bot_share_name", botShareNames)
    .gt("count", 0)

  if (defaultStartDate) {
    totalCountQuery = totalCountQuery.gte("created_at", defaultStartDate)
  }
  if (defaultEndDate) {
    totalCountQuery = totalCountQuery.lte("created_at", defaultEndDate)
  }
  const { count: totalThreadsCount, error: countError } = await totalCountQuery

  // Get initial threads for display (limited) for default time period
  let threadsQuery = supabase
    .from("threads")
    .select(`
      id, created_at, bot_share_name, thread_id, updated_at, duration,
      message_preview, sentiment_score, cb_requested, count, starred, 
      callbacks (id, user_name, user_first_name, user_surname, user_email, user_phone, user_company, user_cb_message),
      bots(client_name, bot_display_name, timezone)
    `)
    .in("bot_share_name", botShareNames)
    .gt("count", 0)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (defaultStartDate) {
    threadsQuery = threadsQuery.gte("created_at", defaultStartDate)
  }
  if (defaultEndDate) {
    threadsQuery = threadsQuery.lte("created_at", defaultEndDate)
  }
  const { data: threads, error: threadsFetchError } = await threadsQuery

  // Determine initial bot display name and selected bot for ChatsList
  let initialBotDisplayName: string | null = null
  let initialSelectedBotForList: string | null = null
  let initialBotTimezone = "UTC"

  if (botShareNames.length === 1) {
    initialSelectedBotForList = botShareNames[0]
    const { data: botDetails } = await supabase
      .from("bots")
      .select("bot_display_name, timezone")
      .eq("bot_share_name", initialSelectedBotForList)
      .single()
    initialBotDisplayName = botDetails?.bot_display_name || initialSelectedBotForList
    if (botDetails?.timezone) initialBotTimezone = botDetails.timezone
  } else if (botShareNames.length > 1) {
    initialBotDisplayName = "All Accessible Bots"
    initialSelectedBotForList = null
  }

  const initialTimezoneAbbr = getTimezoneAbbreviation(initialBotTimezone)

  return (
    <div className="container mx-auto p-4">
      <ChatsPageClient
        initialThreads={threads || []}
        isSuperAdmin={isSuperAdmin}
        initialTotalThreads={totalThreadsCount || 0}
        initialBotDisplayName={initialBotDisplayName}
        initialSelectedBot={initialSelectedBotForList}
        defaultTimePeriodValue={defaultTimePeriodValue}
        accessibleBotShareNames={botShareNames}
        initialTimezoneAbbr={initialTimezoneAbbr}
      />
    </div>
  )
}
