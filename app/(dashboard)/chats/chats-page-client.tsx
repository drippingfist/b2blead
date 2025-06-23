"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, ChevronLeft, ChevronRight, MessageSquare, Clock, RefreshCw } from "lucide-react"
import Link from "next/link"

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
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [botData, setBotData] = useState<Bot | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedTimePeriod")
      return (stored as TimePeriod) || "last30days"
    }
    return "last30days"
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const itemsPerPage = 100
  const [sortField, setSortField] = useState<string | null>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [accessibleBots, setAccessibleBots] = useState<string[]>([])

  // New state for tracking refreshing sentiment
  // const [refreshingSentiment, setRefreshingSentiment] = useState<Set<string>>(new Set())

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      const newBotSelection = event.detail
      setSelectedBot(newBotSelection)
      setCurrentPage(1) // Reset to first page when bot changes
    }

    // Get initial bot selection from localStorage
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  // Load accessible bots and debug info
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

          // Direct database query to verify data exists
          if (!selectedBot && data.accessibleBots?.length > 0) {
            const { count: threadCount, error: threadError } = await supabase
              .from("threads")
              .select("*", { count: "exact", head: true })
              .in("bot_share_name", data.accessibleBots)

            debugText += `Direct DB Query - Thread Count: ${threadCount || 0}\n`

            if (threadError) {
              debugText += `Thread Query Error: ${threadError.message}\n`
            }

            // Test callback query
            const { count: callbackCount, error: callbackError } = await supabase
              .from("callbacks")
              .select("*", { count: "exact", head: true })
              .in("bot_share_name", data.accessibleBots)

            debugText += `Direct DB Query - Callback Count: ${callbackCount || 0}\n`

            if (callbackError) {
              debugText += `Callback Query Error: ${callbackError.message}\n`
            }
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

  // Load bot data when selected bot changes
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

        if (bot) {
          setBotData(bot)
        }
      } catch (error) {
        console.error("Error loading bot data:", error)
      }
    }

    loadBotData()
  }, [selectedBot])

  // Check if user is superadmin
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

  // Load threads data
  useEffect(() => {
    const loadThreads = async () => {
      setLoading(true)
      try {
        // Calculate date range based on time period
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

        // The RLS policy will handle security. The client only needs to apply UI filters.
        let query = supabase
          .from("threads")
          .select(
            `
          *,
          callbacks!callbacks_id_fkey(
            user_name,
            user_first_name,
            user_surname,
            user_email
          )
        `,
            { count: "exact" },
          )
          .gt("count", 0)
          .order(sortField || "created_at", { ascending: sortDirection === "asc" })

        // Apply UI filters from the page
        if (selectedBot) {
          query = query.eq("bot_share_name", selectedBot)
        }
        if (startDate) {
          query = query.gte("created_at", startDate)
        }
        if (filter === "callbacks") {
          query = query.not("callbacks", "is", null)
        } else if (filter === "dropped_callbacks") {
          query = query.eq("callback", true).is("callbacks", null)
        }
        // NOTE: The "user_messages" filter requires a more complex query.
        // This simplified approach will cover the main use cases correctly.
        // A full fix for "user_messages" would involve a database function or a more complex query structure.

        // Pagination
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
  }, [selectedBot, filter, timePeriod, currentPage, sortField, sortDirection])

  // Real-time subscription for new threads
  useEffect(() => {
    // Define a function to handle new threads from the subscription
    const handleNewThread = (payload: any) => {
      const newThread = payload.new as Thread

      // CRITICAL FIX: Only add the new thread if it matches the selected bot,
      // or if "All Bots" is selected (selectedBot is null).
      if (!selectedBot || newThread.bot_share_name === selectedBot) {
        console.log("✅ Real-time: New thread matches filter, adding to view.", newThread)
        setThreads((prevThreads) => [newThread, ...prevThreads])
        setTotalCount((prevCount) => prevCount + 1)
      } else {
        console.log("❌ Real-time: New thread does not match filter, ignoring.", {
          newThreadBot: newThread.bot_share_name,
          selectedBot: selectedBot,
        })
      }
    }

    // Create a Supabase channel subscription for new inserts on the 'threads' table
    const channel = supabase
      .channel("threads-inserts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, handleNewThread)
      .subscribe()

    // Cleanup function: Unsubscribe from the channel when the component unmounts
    // or when the selectedBot changes, to prevent memory leaks and duplicate listeners.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedBot]) // IMPORTANT: Re-run this effect when the selectedBot changes

  // Persist time period selection to localStorage
  useEffect(() => {
    localStorage.setItem("selectedTimePeriod", timePeriod)
  }, [timePeriod])

  const handleStarToggle = async (threadId: string) => {
    try {
      // Find current thread
      const currentThread = threads.find((t) => t.id === threadId)
      if (!currentThread) return

      const newStarredStatus = !currentThread.starred

      // Optimistically update UI
      setThreads((prev) =>
        prev.map((thread) => (thread.id === threadId ? { ...thread, starred: newStarredStatus } : thread)),
      )

      // Update database
      const { error } = await supabase.from("threads").update({ starred: newStarredStatus }).eq("id", threadId)

      if (error) {
        console.error("Error updating starred status:", error)
        // Revert optimistic update
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
      date: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    }
  }

  // Group threads by date for display
  const groupedThreads = threads.reduce((groups: { [key: string]: Thread[] }, thread) => {
    const { date } = formatDateTime(thread.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New sort field, default to descending
      setSortField(field)
      setSortDirection("desc")
    }
    // Reset to first page when sort changes
    setCurrentPage(1)
  }

  const getSortIndicator = (field: string) => {
    if (sortField !== field) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return sortDirection === "asc" ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    )
  }

  // New function to handle sentiment refresh for individual threads
  // const regenerateSentimentForThread = async (threadId: string) => {
  //   if (!threadId) {
  //     console.error("Thread ID is required.")
  //     return
  //   }

  //   // Get the current user's session
  //   const {
  //     data: { session },
  //     error: sessionError,
  //   } = await supabase.auth.getSession()

  //   if (sessionError || !session) {
  //     console.error("Error getting session or user not logged in:", sessionError)
  //     return
  //   }

  //   const userAccessToken = session.access_token

  //   setRefreshingSentiment((prev) => new Set(prev).add(threadId))

  //   try {
  //     // Make direct fetch call to the correct Edge Function URL
  //     const response = await fetch(
  //       "https://bhekqolukbxkxjloffdi.supabase.co/functions/v1/sentiment_analysis_specific",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${userAccessToken}`, // Use the session's access_token
  //           apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", // Include anon key as well
  //         },
  //         body: JSON.stringify({ thread_id: threadId }),
  //       },
  //     )

  //     const data = await response.json()

  //     if (response.ok && data && data.success) {
  //       console.log("Sentiment regeneration successful:", data)
  //       // Update the thread in the local state
  //       setThreads((prev) =>
  //         prev.map((thread) =>
  //           thread.id === threadId
  //             ? {
  //                 ...thread,
  //                 sentiment_score: data.score,
  //                 sentiment_justification: data.justification,
  //               }
  //             : thread,
  //         ),
  //       )
  //     } else {
  //       console.error("Error from Edge Function:", data)
  //     }
  //   } catch (e) {
  //     console.error("Network or frontend error during fetch:", e)
  //   } finally {
  //     setRefreshingSentiment((prev) => {
  //       const newSet = new Set(prev)
  //       newSet.delete(threadId)
  //       return newSet
  //     })
  //   }
  // }

  // We've removed the restriction that prevented viewing chats when "All Bots" is selected

  return (
    <div className="p-4 md:p-6 relative">
      {/* Tooltip */}
      {hoveredSentiment && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-base rounded-lg px-4 py-3 max-w-sm shadow-lg pointer-events-none transition-opacity duration-150"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
        >
          {threads.find((t) => t.id === hoveredSentiment)?.sentiment_justification}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
            <p className="text-[#616161]">View and manage chat conversations</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            {/* Filter Dropdown */}
            <Select
              value={filter}
              onValueChange={(value: FilterType) => {
                setFilter(value)
                setCurrentPage(1)
              }}
            >
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
            <Select
              value={timePeriod}
              onValueChange={(value: TimePeriod) => {
                setTimePeriod(value)
                setCurrentPage(1)
              }}
            >
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1)
                // Force a re-fetch by updating a dependency
                setLoading(true)
                // The useEffect will automatically re-run and fetch fresh data
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dynamic Subheading */}
        {(botData || (!selectedBot && isSuperAdmin)) && (
          <p className="text-sm text-[#616161]">
            Showing threads on <span className="font-medium">{botData?.client_name || "All Bots"}</span> in{" "}
            {getTimePeriodLabel()}
            {getFilterLabel()} ({totalCount} threads)
          </p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[#616161]">Loading threads...</div>
        </div>
      )}

      {/* No Data State */}
      {!loading && threads.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#212121] mb-2">No threads found</h3>
          <p className="text-[#616161]">
            No threads match your current filter criteria. Try adjusting your filters or time period.
          </p>
        </div>
      )}

      {/* Threads Table */}
      {!loading && threads.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
          {/* Pagination Info */}
          <div className="px-6 py-3 border-b border-[#e0e0e0] bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#616161]">
                {startItem}-{endItem} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
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
                    {/* Date Header Row */}
                    <tr key={`date-${date}`} className="bg-gray-50">
                      <td
                        colSpan={!selectedBot && isSuperAdmin ? 9 : 8}
                        className="px-6 py-2 text-sm font-medium text-[#616161]"
                      >
                        {date}
                      </td>
                    </tr>
                    {/* Thread Rows */}
                    {dateThreads.map((thread) => (
                      <tr key={thread.id} className="hover:bg-gray-50">
                        {/* Time */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {formatDateTime(thread.created_at).time}
                        </td>

                        {/* Bot (only show for superadmin viewing all bots) */}
                        {!selectedBot && isSuperAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {thread.bot_share_name || "Unknown"}
                            </span>
                          </td>
                        )}

                        {/* Callback */}
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

                        {/* Sentiment */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {thread.sentiment_score ? (
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onMouseEnter={(e) => handleSentimentHover(thread.id, thread.sentiment_justification, e)}
                              onMouseLeave={handleSentimentLeave}
                              onMouseMove={(e) => {
                                if (hoveredSentiment === thread.id) {
                                  setTooltipPosition({ x: e.clientX, y: e.clientY })
                                }
                              }}
                            >
                              <span className="text-lg">{getSentimentEmoji(thread.sentiment_score)}</span>
                              <span className="text-[#212121]">{thread.sentiment_score}</span>
                            </div>
                          ) : (
                            <span className="text-[#616161]">-</span>
                          )}
                        </td>

                        {/* Message Preview */}
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/thread/${thread.id}`}
                            className="text-[#212121] hover:underline hover:text-[#038a71] max-w-xs truncate block transition-colors"
                          >
                            {thread.message_preview || "No preview available"}
                          </Link>
                        </td>

                        {/* Messages Count */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4 text-[#616161]" />
                            {thread.count || 0}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-[#616161]" />
                            {formatDuration(thread.duration)}
                          </div>
                        </td>

                        {/* Avg Response Time */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {formatResponseTime(thread.mean_response_time)}
                        </td>

                        {/* Actions */}
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
