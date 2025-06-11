import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import ChatsPageClient from "./chats-page-client"
import { getThreadsSimple, getThreadsCount } from "@/lib/simple-database"
import { calculateDateRangeForQuery } from "@/lib/time-utils"
import { getTimezoneAbbreviation } from "@/lib/timezone-utils"

export const dynamic = "force-dynamic"

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const userId = session.user.id

  // Get user's bot access
  const { data: userBots, error: userBotsError } = await supabase
    .from("bot_users")
    .select("bot_share_name, role")
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

  // Get the selected bot from URL or default to null (all bots)
  const selectedBot = typeof searchParams.bot === "string" ? searchParams.bot : null

  // Get the selected time period from URL or default to "last30days"
  const selectedTimePeriod = typeof searchParams.timePeriod === "string" ? searchParams.timePeriod : "last30days"

  console.log("🔍 ChatsPage: selectedBot =", selectedBot)
  console.log("🕐 ChatsPage: selectedTimePeriod =", selectedTimePeriod)

  // Calculate date range based on selected time period
  const { startDate, endDate } = calculateDateRangeForQuery(selectedTimePeriod)
  const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : null

  console.log("📅 ChatsPage: dateRange =", dateRange)

  // Get threads for display (limited to 50)
  const threads = await getThreadsSimple(50, selectedBot, dateRange)

  // Get ACTUAL count of threads matching the filter
  const actualTotalCount = await getThreadsCount(selectedBot, dateRange)

  console.log("✅ ChatsPage: fetched", threads.length, "threads for display")
  console.log("🔢 ChatsPage: actual total count =", actualTotalCount)

  // Get bot display information
  let botDisplayName: string | null = null
  let botTimezone = "UTC"

  if (selectedBot) {
    const { data: botDetails } = await supabase
      .from("bots")
      .select("bot_display_name, client_name, timezone")
      .eq("bot_share_name", selectedBot)
      .single()

    if (botDetails) {
      botDisplayName = botDetails.bot_display_name || botDetails.client_name || selectedBot
      botTimezone = botDetails.timezone || "UTC"
    }
  } else {
    botDisplayName = "All Accessible Bots"
  }

  const timezoneAbbr = getTimezoneAbbreviation(botTimezone)

  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ChatsPageClient
          initialThreads={threads}
          selectedBot={selectedBot}
          selectedTimePeriod={selectedTimePeriod}
          actualTotalCount={actualTotalCount}
          botDisplayName={botDisplayName}
          timezoneAbbr={timezoneAbbr}
          accessibleBotShareNames={userBots.map((bot) => bot.bot_share_name)}
        />
      </Suspense>
    </div>
  )
}
