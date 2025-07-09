"use client"

import type React from "react"

// STEP 1: Import necessary hooks from 'react' and 'next/navigation'
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, ChevronLeft, ChevronRight, MessageSquare, Clock, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useBotSelection } from "@/hooks/use-bot-selection"

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
  callback?: boolean
  count?: number
  mean_response_time?: number
  starred?: boolean
  callbacks?: {
    user_name?: string
    user_first_name?: string
    user_surname?: string
    user_email?: string
  }
}

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
  timezone?: string
}

type FilterType = "all" | "callbacks" | "dropped_callbacks" | "user_messages"
type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"

export default function ChatsPageClient() {
  // STEP 2: Set up Next.js navigation hooks
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { selectedBot, isSelectionLoaded } = useBotSelection()
  const [botData, setBotData] = useState<Bot | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const itemsPerPage = 100
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // STEP 3: Manage state with local state variables. These will be synced with the URL.
  const [filter, setFilter] = useState<FilterType>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("last30days")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [accessibleBots, setAccessibleBots] = useState<string[]>([])

  // STEP 4: Create a helper function to build the new query string
  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString())
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "") {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      }
      return newSearchParams.toString()
    },
    [searchParams],
  )

  // STEP 5: Sync state from URL on component load and when URL changes (e.g., back/forward)
  useEffect(() => {
    setFilter((searchParams.get("filter") as FilterType) || "all")
    setTimePeriod((searchParams.get("period") as TimePeriod) || "last30days")
    setCurrentPage(Number(searchParams.get("page")) || 1)
    setSortField(searchParams.get("sort") || "created_at")
    setSortDirection((searchParams.get("dir") as "asc" | "desc") || "desc")
  }, [searchParams])

  // Reset to first page when bot selection changes
  useEffect(() => {
    if (isSelectionLoaded) {
      // Just reset the page, keep other filters
      router.push(pathname + "?" + createQueryString({ page: 1 }))
    }
  }, [selectedBot, isSelectionLoaded]) // Keep router/pathname/createQueryString out of deps to avoid loops

  // Load accessible bots and debug info (no changes needed here)
  useEffect(() => {
    const loadAccessibleBots = async () => {
      try {
        const response = await fetch("/api/user-bot-access")
        if (response.ok) {
          const data = await response.json()
          setAccessibleBots(data.accessibleBots || [])

          let debugText = `=== CHATS DEBUG INFO ===\n`
          debugText += `Selected Bot: ${selectedBot || "All Bots"}\n`
          debugText += `Accessible Bots Count: ${data.accessibleBots?.length || 0}\n`
          debugText += `Accessible Bots: ${data.accessibleBots?.join(", ") || "None"}\n`
          debugText += `Is SuperAdmin: ${data.isSuperAdmin}\n`
          debugText += `User Role: ${data.role}\n`
          debugText += `Filter: ${filter}\n`
          debugText += `Time Period: ${timePeriod}\n\n`

          if (!selectedBot && data.accessibleBots?.length > 0) {
            const { count: threadCount, error: threadError } = await supabase
              .from("threads")
              .select("*", { count: "exact", head: true })
              .in("bot_share_name", data.accessibleBots)

            debugText += `Direct DB Query - Thread Count: ${threadCount || 0}\n`
            if (threadError) debugText += `Thread Query Error: ${threadError.message}\n`

            const { count: callbackCount, error: callbackError } = await supabase
              .from("callbacks")
              .select("*", { count: "exact", head: true })
              .in("bot_share_name", data.accessibleBots)

            debugText += `Direct DB Query - Callback Count: ${callbackCount || 0}\n`
            if (callbackError) debugText += `Callback Query Error: ${callbackError.message}\n`
          }

          setDebugInfo(debugText)
        }
      } catch (error) {
        console.error("Error loading accessible bots:", error)
        setDebugInfo(`Error loading accessible bots: ${error}`)
      }
    }

    loadAccessibleBots()
  }, [selectedBot, filter, timePeriod])

  // Load bot data when selected bot changes (no changes needed here)
  useEffect(() => {
    const loadBotData = async () => {
      if (!selectedBot) {
        setBotData(null)
        return
      }
      try {
        const { data: bot } = await supabase
          .from("bots")
          .select("id, bot_share_name, client_name, timezone")
          .eq("bot_share_name", selectedBot)
          .single()
        if (bot) setBotData(bot)
      } catch (error) {
        console.error("Error loading bot data:", error)
      }
    }
    loadBotData()
  }, [selectedBot])

  // Check if user is superadmin (no changes needed here)
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const response = await fetch("/api/user-bot-access")
        if (response.ok) {
          const data = await response.json()
          setIsSuperAdmin(data.isSuperAdmin)
        }
      } catch (error) {
        console.error("Error checking superadmin status:", error)
      }
    }
    checkSuperAdminStatus()
  }, [])

  // Load threads data (no changes needed here, dependencies will update from URL sync)
  useEffect(() => {
    const loadThreads = async () => {
      if (!isSelectionLoaded) return
      setLoading(true)
      try {
        let startDate: string | null = null
        const now = new Date()
        switch (timePeriod) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            break
          case "last7days":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            break
          case "last30days":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
            break
          case "last90days":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
            break
          case "alltime":
            startDate = null
            break
        }
        let query = supabase
          .from("threads")
          .select(
            `
          *,
          callbacks!callbacks_id_fkey(user_name, user_first_name, user_surname, user_email)
        `,
            { count: "exact" },
          )
          .gt("count", 0)
          .order(sortField || "created_at", { ascending: sortDirection === "asc" })

        if (selectedBot) query = query.eq("bot_share_name", selectedBot)
        if (startDate) query = query.gte("created_at", startDate)
        if (filter === "callbacks") query = query.not("callbacks", "is", null)
        else if (filter === "dropped_callbacks") query = query.eq("callback", true).is("callbacks", null)

        const offset = (currentPage - 1) * itemsPerPage
        query = query.range(offset, offset + itemsPerPage - 1)

        const { data: threadsData, error, count } = await query

        if (error) {
          console.error("Error fetching threads:", error)
          setThreads([])
          setTotalCount(0)
        } else {
          setThreads(threadsData || [])
          setTotalCount(count || 0)
        }
      } catch (error) {
        console.error("Error loading threads:", error)
        setThreads([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }
    loadThreads()
  }, [selectedBot, filter, timePeriod, currentPage, sortField, sortDirection, isSelectionLoaded])

  // Real-time subscription (no changes needed here)
  useEffect(() => {
    const handleNewThread = (payload: any) => {
      const newThread = payload.new as Thread
      if (!selectedBot || newThread.bot_share_name === selectedBot) {
        console.log("✅ Real-time: New thread matches filter, adding to view.", newThread)
        setThreads((prevThreads) => [newThread, ...prevThreads])
        setTotalCount((prevCount) => prevCount + 1)
      } else {
        console.log("🟡 Real-time: New thread does not match filter, ignoring.", {
          newThreadBot: newThread.bot_share_name,
          selectedBot: selectedBot,
        })
      }
    }
    const channel = supabase
      .channel(`public-threads-for-user`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, handleNewThread)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedBot])

  // STEP 6: Remove the localStorage persistence effect for timePeriod
  // useEffect(() => { localStorage.setItem("selectedTimePeriod", timePeriod) }, [timePeriod]) // REMOVED

  // All other functions (handleStarToggle, getSentimentEmoji, etc.) remain unchanged.
  const handleStarToggle = async (threadId: string) => {
    try {
      const currentThread = threads.find((t) => t.id === threadId)
      if (!currentThread) return
      const newStarredStatus = !currentThread.starred
      setThreads((prev) =>
        prev.map((thread) => (thread.id === threadId ? { ...thread, starred: newStarredStatus } : thread)),
      )
      const { error } = await supabase.from("threads").update({ starred: newStarredStatus }).eq("id", threadId)
      if (error) {
        console.error("Error updating starred status:", error)
        setThreads((prev) =>
          prev.map((thread) => (thread.id === threadId ? { ...thread, starred: !newStarredStatus } : thread)),
        )
      }
    } catch (error) {
      console.error("Error toggling star:", error)
    }
  }

  const handleSentimentHover = (threadId: string, justification: string | null, event: React.MouseEvent) => {
    if (justification) {
      setHoveredSentiment(threadId)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleSentimentLeave = () => {
    setHoveredSentiment(null)
  }

  const getSentimentEmoji = (score?: number) => {
    if (!score) return "😐"
    switch (score) {
      case 1:
        return "😡"
      case 2:
        return "😞"
      case 3:
        return "😐"
      case 4:
        return "😊"
      case 5:
        return "😍"
      default:
        return "😐"
    }
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return "00:00:00"
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (match) {
      const [, hours, minutes, seconds] = match
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
    }
    return duration
  }

  const formatResponseTime = (time?: number) => {
    if (!time) return "N/A"
    return `${(time / 1000).toFixed(2)}s`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    }
  }

  const groupedThreads = threads.reduce((groups: { [key: string]: Thread[] }, thread) => {
    const { date } = formatDateTime(thread.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(thread)
    return groups
  }, {})

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "today":
        return "today"
      case "last7days":
        return "the last 7 days"
      case "last30days":
        return "the last 30 days"
      case "last90days":
        return "the last 90 days"
      case "alltime":
        return "all time"
      default:
        return "the last 30 days"
    }
  }

  const getFilterLabel = () => {
    switch (filter) {
      case "callbacks":
        return ", filtered by callbacks"
      case "dropped_callbacks":
        return ", filtered by dropped callbacks"
      case "user_messages":
        return ", filtered by user messages"
      default:
        return ""
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  // STEP 7: Define new handlers that update the URL
  const handleFilterChange = (value: FilterType) => {
    router.push(pathname + "?" + createQueryString({ filter: value, page: "1" }))
  }

  const handleTimePeriodChange = (value: TimePeriod) => {
    router.push(pathname + "?" + createQueryString({ period: value, page: "1" }))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push(pathname + "?" + createQueryString({ page: String(newPage) }))
    }
  }

  const handleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc"
    router.push(pathname + "?" + createQueryString({ sort: field, dir: newDirection, page: "1" }))
  }

  const getSortIndicator = (field: string) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>
    return sortDirection === "asc" ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    )
  }

  if (!isSelectionLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#616161]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 relative">
      {hoveredSentiment && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-base rounded-lg px-4 py-3 max-w-sm shadow-lg pointer-events-none transition-opacity duration-150"
          style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y - 10 }}
        >
          {threads.find((t) => t.id === hoveredSentiment)?.sentiment_justification}
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
            <p className="text-[#616161]">View and manage chat conversations</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            {/* Filter Dropdown */}
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Threads</SelectItem>
                <SelectItem value="callbacks">Callbacks</SelectItem>
                <SelectItem value="dropped_callbacks">Dropped Callbacks</SelectItem>
                <SelectItem value="user_messages">User Messages</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Period Dropdown */}
            <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="last90days">Last 90 days</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" size="sm" onClick={() => router.refresh()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {(botData || (!selectedBot && isSuperAdmin)) && (
          <p className="text-sm text-[#616161]">
            Showing threads on <span className="font-medium">{botData?.client_name || "All Bots"}</span> in{" "}
            {getTimePeriodLabel()}
            {getFilterLabel()} ({totalCount} threads)
          </p>
        )}
      </div>

      {!loading && threads.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#212121] mb-2">No threads found</h3>
          <p className="text-[#616161]">
            No threads match your current filter criteria. Try adjusting your filters or time period.
          </p>
        </div>
      )}

      {!loading && threads.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
          <div className="px-6 py-3 border-b border-[#e0e0e0] bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#616161]">
                {startItem}-{endItem} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-[#616161]">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[#e0e0e0]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      START TIME {getSortIndicator("created_at")}
                    </button>
                  </th>
                  {!selectedBot && isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("bot_share_name")}
                        className="flex items-center hover:text-blue-600 transition-colors"
                      >
                        BOT {getSortIndicator("bot_share_name")}
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    CALLBACK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("sentiment_score")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      SENTIMENT {getSortIndicator("sentiment_score")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("message_preview")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      MESSAGE PREVIEW {getSortIndicator("message_preview")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("count")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      MESSAGES {getSortIndicator("count")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("duration")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      DURATION {getSortIndicator("duration")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("mean_response_time")}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      AVG. RESPONSE TIME {getSortIndicator("mean_response_time")}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e0e0e0]">
                {Object.entries(groupedThreads).map(([date, dateThreads]) => (
                  <>
                    <tr key={`date-${date}`} className="bg-gray-50">
                      <td
                        colSpan={!selectedBot && isSuperAdmin ? 9 : 8}
                        className="px-6 py-2 text-sm font-medium text-[#616161]"
                      >
                        {date}
                      </td>
                    </tr>
                    {dateThreads.map((thread) => (
                      <tr key={thread.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {formatDateTime(thread.created_at).time}
                        </td>
                        {!selectedBot && isSuperAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {thread.bot_share_name || "Unknown"}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {thread.callbacks ? (
                            <div>
                              <div className="font-medium">
                                {thread.callbacks.user_name ||
                                  `${thread.callbacks.user_first_name || ""} ${thread.callbacks.user_surname || ""}`.trim() ||
                                  "Unknown"}
                              </div>
                              {thread.callbacks.user_email && (
                                <div className="text-[#616161] text-xs">{thread.callbacks.user_email}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#616161]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {thread.sentiment_score ? (
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onMouseEnter={(e) => handleSentimentHover(thread.id, thread.sentiment_justification, e)}
                              onMouseLeave={handleSentimentLeave}
                              onMouseMove={(e) => {
                                if (hoveredSentiment === thread.id) setTooltipPosition({ x: e.clientX, y: e.clientY })
                              }}
                            >
                              <span className="text-lg">{getSentimentEmoji(thread.sentiment_score)}</span>
                              <span className="text-[#212121]">{thread.sentiment_score}</span>
                            </div>
                          ) : (
                            <span className="text-[#616161]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/thread/${thread.id}`}
                            className="text-[#212121] hover:underline hover:text-[#038a71] max-w-xs truncate block transition-colors"
                          >
                            {thread.message_preview || "No preview available"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-[#616161]" />
                            {thread.count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-[#616161]" />
                            {formatDuration(thread.duration)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {formatResponseTime(thread.mean_response_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleStarToggle(thread.id)}
                            className="text-[#616161] hover:text-[#212121] transition-colors"
                          >
                            <Star
                              className={`h-4 w-4 ${thread.starred ? "fill-yellow-400 text-yellow-400" : "text-[#616161]"}`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
