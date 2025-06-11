import { Suspense } from "react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsPageClient from "./chats-page-client"
import { getThreadsSimple, getThreadsCount, getBots } from "@/lib/simple-database"
import { calculateDateRangeForQuery } from "@/lib/time-utils"
import { getTimezoneAbbreviation } from "@/lib/timezone-utils"

const DEFAULT_TIME_PERIOD = "last30days"
const PAGE_SIZE = 50

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: { bot?: string; timePeriod?: string; page?: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get URL parameters
  const selectedBot = searchParams.bot || null
  const selectedTimePeriod = searchParams.timePeriod || DEFAULT_TIME_PERIOD
  const currentPage = Number.parseInt(searchParams.page || "1", 10)

  console.log("🔍 ChatsPage server params:", { selectedBot, selectedTimePeriod, currentPage })

  try {
    // Get accessible bots
    const bots = await getBots(user.id)
    const accessibleBotShareNames = bots.map((bot) => bot.bot_share_name)

    // Calculate date range for the selected time period
    const { startDate, endDate } = calculateDateRangeForQuery(selectedTimePeriod)

    // Get total count for the selected time period and bot
    const totalCount = await getThreadsCount(user.id, selectedBot, startDate, endDate)

    // Get paginated threads
    const threads = await getThreadsSimple(
      user.id,
      selectedBot,
      startDate,
      endDate,
      (currentPage - 1) * PAGE_SIZE,
      PAGE_SIZE,
    )

    // Get bot display information
    const selectedBotObj = bots.find((bot) => bot.bot_share_name === selectedBot)
    const botDisplayName = selectedBotObj?.client_name || selectedBotObj?.bot_display_name || selectedBot
    const timezone = selectedBotObj?.timezone || "Asia/Bangkok"
    const timezoneAbbr = getTimezoneAbbreviation(timezone)

    console.log("📊 ChatsPage data:", {
      threadsCount: threads.length,
      totalCount,
      selectedTimePeriod,
      dateRange: { startDate, endDate },
    })

    return (
      <Suspense fallback={<div>Loading chats...</div>}>
        <ChatsPageClient
          initialThreads={threads}
          selectedBot={selectedBot}
          selectedTimePeriod={selectedTimePeriod}
          totalCount={totalCount}
          botDisplayName={botDisplayName}
          timezoneAbbr={timezoneAbbr}
          accessibleBotShareNames={accessibleBotShareNames}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    )
  } catch (error) {
    console.error("❌ Error in ChatsPage:", error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Error Loading Chats</h1>
          <p className="text-gray-600">There was an error loading your chats. Please try again.</p>
        </div>
      </div>
    )
  }
}
