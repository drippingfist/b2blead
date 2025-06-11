"use client"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TIME_PERIODS } from "@/lib/time-utils"

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: { timePeriod?: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get time period from URL or default to last 30 days
  const selectedTimePeriod = searchParams.timePeriod || "last30days"
  const timePeriodLabel = TIME_PERIODS.find((period) => period.value === selectedTimePeriod)?.label || "All Time"

  // Calculate date range based on selected time period
  let startDate: string | undefined
  const endDate = new Date().toISOString()

  if (selectedTimePeriod === "last7days") {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    startDate = date.toISOString()
  } else if (selectedTimePeriod === "last30days") {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    startDate = date.toISOString()
  } else if (selectedTimePeriod === "today") {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    startDate = date.toISOString()
  }
  // For "all" time period, startDate remains undefined

  // Build query
  let query = supabase
    .from("threads")
    .select(
      `
      id,
      thread_id,
      created_at,
      updated_at,
      message_preview,
      count,
      bot_share_name,
      bots(bot_display_name, client_name)
    `,
      { count: "exact" },
    )
    .gt("count", 0)

  // Apply date filter if needed
  if (startDate) {
    query = query.gte("created_at", startDate).lte("created_at", endDate)
  }

  // Execute query
  const { data: threads, error, count } = await query.order("updated_at", { ascending: false }).limit(50)

  if (error) {
    console.error("Error fetching threads:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>

          <div className="flex items-center space-x-2">
            <label htmlFor="timePeriod" className="text-sm text-gray-600">
              Time period:
            </label>
            <select
              id="timePeriod"
              className="border border-gray-300 rounded-md text-sm p-1"
              onChange={(e) => {
                const url = new URL(window.location.href)
                url.searchParams.set("timePeriod", e.target.value)
                window.location.href = url.toString()
              }}
              defaultValue={selectedTimePeriod}
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-gray-600 mt-1">
          Showing threads from {timePeriodLabel} ({count || 0} {count === 1 ? "thread" : "threads"})
        </p>
      </div>

      <div className="space-y-4">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">Thread {thread.thread_id || thread.id.slice(0, 8)}</h3>
                <span className="text-sm text-gray-500">{new Date(thread.updated_at).toLocaleDateString()}</span>
              </div>

              <p className="text-gray-600 text-sm mb-2">{thread.message_preview || "No preview available"}</p>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{thread.count} messages</span>
                <span>{thread.bots?.client_name || thread.bots?.bot_display_name || thread.bot_share_name}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No chats found</p>
          </div>
        )}
      </div>
    </div>
  )
}
