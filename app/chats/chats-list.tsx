"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { Clock, MessageSquare, Phone, Star, Trash2 } from "lucide-react"
import { formatTimeInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"
import { calculateDateRangeForQuery, TIME_PERIODS } from "@/lib/time-utils"

interface Thread {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  updated_at: string
  duration?: string
  message_preview?: string
  sentiment_score?: number
  sentiment_justification?: string
  cb_requested?: boolean
  count?: number
  mean_response_time?: number
  starred?: boolean
  callbacks?: any
  bots?: {
    client_name?: string
    bot_display_name?: string
    timezone?: string
  } | null
}

interface ChatsListProps {
  selectedBot: string | null
  isSuperAdmin?: boolean
  onRefresh?: () => void
  initialThreads: Thread[]
  initialTotalThreads: number
  initialBotDisplayName: string | null
  selectedTimePeriod: string
  accessibleBotShareNames: string[]
  setCurrentTimezoneAbbr: (abbr: string) => void
  setCurrentBotNameToDisplay: (name: string | null) => void
}

// PAGE_SIZE is now dynamic via pageSize state

export default function ChatsList({
  selectedBot,
  isSuperAdmin = false,
  onRefresh,
  initialThreads,
  initialTotalThreads,
  initialBotDisplayName,
  selectedTimePeriod,
  accessibleBotShareNames,
  setCurrentTimezoneAbbr,
  setCurrentBotNameToDisplay,
}: ChatsListProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [loading, setLoading] = useState(false)
  const [selectedThreadsSet, setSelectedThreadsSet] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [pageSize, setPageSize] = useState<number>(50)

  // State for data fetched by this component
  const [botTimezone, setBotTimezone] = useState<string>("UTC")
  const [actualTotalThreads, setActualTotalThreads] = useState<number>(initialTotalThreads)
  const [activeFilter, setActiveFilter] = useState<"none" | "callbacks" | "dropped-callbacks">("none")

  // The core loadData function
  const loadData = useCallback(async () => {
    console.log("🔄 ChatsList: loadData called")
    console.log("🔄 ChatsList: selectedTimePeriod:", selectedTimePeriod)
    console.log("🔄 ChatsList: selectedBot:", selectedBot)

    setLoading(true)
    try {
      const { startDate, endDate } = calculateDateRangeForQuery(selectedTimePeriod)
      console.log("🔄 ChatsList: Date range calculated:", { startDate, endDate })

      const targetBots = selectedBot ? [selectedBot] : accessibleBotShareNames
      console.log("🔄 ChatsList: Target bots:", targetBots)

      // Handle case where non-superadmin has no bots
      if (!isSuperAdmin && targetBots.length === 0) {
        setThreads([])
        setActualTotalThreads(0)
        setCurrentBotNameToDisplay(initialBotDisplayName)
        setBotTimezone("UTC")
        setCurrentTimezoneAbbr(getTimezoneAbbreviation("UTC"))
        setLoading(false)
        return
      }

      // 1. Fetch Paginated Threads for Display
      let threadsQuery = supabase
        .from("threads")
        .select(`
          id, created_at, bot_share_name, thread_id, updated_at, duration, message_preview,
          sentiment_score, sentiment_justification, cb_requested, count, mean_response_time, starred,
          callbacks!callbacks_id_fkey(*),
          bots(client_name, bot_display_name, timezone)
        `)
        .gt("count", 0)
        .order("updated_at", { ascending: false })
        .limit(pageSize)

      if (targetBots.length > 0) {
        threadsQuery = threadsQuery.in("bot_share_name", targetBots)
      }

      if (startDate) {
        console.log("🔄 ChatsList: Applying startDate filter:", startDate)
        threadsQuery = threadsQuery.gte("created_at", startDate)
      }
      if (endDate) {
        console.log("🔄 ChatsList: Applying endDate filter:", endDate)
        threadsQuery = threadsQuery.lte("created_at", endDate)
      }

      console.log("🔄 ChatsList: Executing threads query...")
      const { data: threadsData, error: threadsError } = await threadsQuery
      if (threadsError) {
        console.error("❌ ChatsList: Threads query error:", threadsError)
        throw threadsError
      }
      console.log("✅ ChatsList: Threads fetched:", threadsData?.length || 0)
      setThreads(threadsData || [])

      // 2. Fetch Actual Total Count
      let countQuery = supabase.from("threads").select("id", { count: "exact", head: true }).gt("count", 0)

      if (targetBots.length > 0) {
        countQuery = countQuery.in("bot_share_name", targetBots)
      }
      if (startDate) {
        console.log("🔄 ChatsList: Applying startDate filter to count:", startDate)
        countQuery = countQuery.gte("created_at", startDate)
      }
      if (endDate) {
        console.log("🔄 ChatsList: Applying endDate filter to count:", endDate)
        countQuery = countQuery.lte("created_at", endDate)
      }

      console.log("🔄 ChatsList: Executing count query...")
      const { count, error: countError } = await countQuery

      if (countError) {
        console.error("❌ ChatsList: Count query error:", countError)
        setActualTotalThreads(threadsData?.length || 0)
      } else {
        console.log("✅ ChatsList: Count fetched:", count)
        setActualTotalThreads(count || 0)
      }

      // 3. Update bot display name and timezone for the current view
      let currentViewBotTimezone = "UTC"
      let currentViewBotDisplayName = initialBotDisplayName

      if (selectedBot) {
        const botDataFromThreads = threadsData?.find((t) => t.bot_share_name === selectedBot)?.bots
        if (botDataFromThreads) {
          currentViewBotTimezone = botDataFromThreads.timezone || "UTC"
          currentViewBotDisplayName = botDataFromThreads.bot_display_name || selectedBot
        } else {
          const { data: botDetails } = await supabase
            .from("bots")
            .select("timezone, bot_display_name")
            .eq("bot_share_name", selectedBot)
            .single()
          currentViewBotTimezone = botDetails?.timezone || "UTC"
          currentViewBotDisplayName = botDetails?.bot_display_name || selectedBot
        }
      } else if (threadsData && threadsData.length > 0 && threadsData[0].bots?.timezone) {
        currentViewBotTimezone = threadsData[0].bots.timezone
      }

      setBotTimezone(currentViewBotTimezone)
      setCurrentTimezoneAbbr(getTimezoneAbbreviation(currentViewBotTimezone))
      setCurrentBotNameToDisplay(currentViewBotDisplayName)
    } catch (error) {
      console.error("❌ ChatsList: Error loading threads data:", error)
      setThreads([])
      setActualTotalThreads(0)
    } finally {
      setLoading(false)
    }
  }, [
    selectedBot,
    selectedTimePeriod,
    accessibleBotShareNames,
    isSuperAdmin,
    initialBotDisplayName,
    setCurrentTimezoneAbbr,
    setCurrentBotNameToDisplay,
    pageSize,
  ])

  useEffect(() => {
    console.log("🔄 ChatsList: useEffect triggered, calling loadData")
    loadData()
  }, [loadData])

  const handleSelectAll = () => {
    if (selectedThreadsSet.size === threads.length) {
      setSelectedThreadsSet(new Set())
    } else {
      setSelectedThreadsSet(new Set(threads.map((t) => t.id)))
    }
  }

  const handleSelectThread = (threadId: string) => {
    const newSelected = new Set(selectedThreadsSet)
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId)
    } else {
      newSelected.add(threadId)
    }
    setSelectedThreadsSet(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedThreadsSet.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch("/api/delete-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadIds: Array.from(selectedThreadsSet) }),
      })

      if (response.ok) {
        setSelectedThreadsSet(new Set())
        await loadData()
        onRefresh?.()
      } else {
        console.error("Failed to delete threads")
      }
    } catch (error) {
      console.error("Error deleting threads:", error)
    } finally {
      setDeleting(false)
    }
  }

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 7) return "😊"
    if (sentiment >= 4) return "😐"
    return "😞"
  }

  const formatMeanResponseTime = (meanResponseTime?: number) => {
    if (meanResponseTime === undefined || meanResponseTime === null) return "N/A"
    const seconds = meanResponseTime / 1000
    return `${seconds.toFixed(2)}s`
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "Not provided"
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  if (loading) {
    return <div className="p-4">Loading threads...</div>
  }

  const timezoneAbbr = getTimezoneAbbreviation(botTimezone)
  const currentPeriodLabel = TIME_PERIODS.find((p) => p.value === selectedTimePeriod)?.label || selectedTimePeriod

  // Apply active filter
  const clientFilteredThreads = threads.filter((thread) => {
    if (activeFilter === "callbacks") return thread.callbacks
    if (activeFilter === "dropped-callbacks") return thread.cb_requested && !thread.callbacks
    return true
  })

  return (
    <div className="space-y-4">
      {/* Superadmin Controls */}
      {isSuperAdmin && threads.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedThreadsSet.size === threads.length && threads.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Select All</span>
            </label>
            {selectedThreadsSet.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedThreadsSet.size} thread{selectedThreadsSet.size !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          {selectedThreadsSet.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleting ? "Deleting..." : "Delete Selected"}</span>
            </button>
          )}
        </div>
      )}

      {/* Page Size Selector */}
      <div className="flex justify-between items-center px-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={50}>50 threads</option>
            <option value={100}>100 threads</option>
            <option value={500}>500 threads</option>
          </select>
        </div>
      </div>

      {(threads.length > 0 || loading) && (
        <p className="text-sm text-[#616161] px-4">
          Showing {clientFilteredThreads.length > 0 ? clientFilteredThreads.length : loading ? "..." : "0"} of{" "}
          {actualTotalThreads} threads for {currentPeriodLabel}
          {initialBotDisplayName ? ` • ${initialBotDisplayName}` : ""}
          {" • "}Times in {timezoneAbbr}
          {activeFilter === "callbacks" && <span className="text-green-600"> • with callbacks</span>}
          {activeFilter === "dropped-callbacks" && <span className="text-green-600"> • with dropped callbacks</span>}
        </p>
      )}

      {threads.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <p className="text-[#616161]">No chats found for the selected time period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientFilteredThreads.map((thread) => (
            <div key={thread.id} className="border border-[#e0e0e0] rounded-lg overflow-hidden bg-white">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {isSuperAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedThreadsSet.has(thread.id)}
                        onChange={() => handleSelectThread(thread.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <Link href={`/chats/${thread.id}`} className="font-medium text-[#212121] hover:text-[#038a71]">
                          Thread {thread.thread_id || thread.id.slice(0, 8)}
                        </Link>
                        {thread.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        {thread.cb_requested && (
                          <div className="flex items-center space-x-1 text-[#038a71]">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm font-medium">Callback</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-[#616161] mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimeInTimezone(thread.created_at, botTimezone)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{getSentimentEmoji(thread.sentiment_score)}</span>
                          <span>Sentiment</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{thread.count || 0} messages</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Avg: {formatMeanResponseTime(thread.mean_response_time)}</span>
                        </div>
                      </div>

                      <div className="text-sm text-[#616161] mb-3">
                        <p className="line-clamp-2">{thread.message_preview || "No preview available"}</p>
                      </div>

                      {thread.callbacks && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            Callback Request
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {(thread.callbacks.user_name ||
                              thread.callbacks.user_first_name ||
                              thread.callbacks.user_surname) && (
                              <div>
                                <span className="font-medium text-blue-700">Name: </span>
                                <span className="text-blue-900">
                                  {thread.callbacks.user_name ||
                                    `${thread.callbacks.user_first_name || ""} ${thread.callbacks.user_surname || ""}`.trim()}
                                </span>
                              </div>
                            )}

                            {thread.callbacks.user_email && (
                              <div>
                                <span className="font-medium text-blue-700">Email: </span>
                                <span className="text-blue-900">{thread.callbacks.user_email}</span>
                              </div>
                            )}

                            {thread.callbacks.user_phone && (
                              <div>
                                <span className="font-medium text-blue-700">Phone: </span>
                                <span className="text-blue-900">{formatPhoneNumber(thread.callbacks.user_phone)}</span>
                              </div>
                            )}

                            {thread.callbacks.user_company && (
                              <div>
                                <span className="font-medium text-blue-700">Company: </span>
                                <span className="text-blue-900">{thread.callbacks.user_company}</span>
                              </div>
                            )}
                          </div>

                          {thread.callbacks.user_cb_message && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <span className="font-medium text-blue-700">Message: </span>
                              <p className="text-blue-900 mt-1">{thread.callbacks.user_cb_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
