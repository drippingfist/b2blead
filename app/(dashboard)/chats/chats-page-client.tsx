"use client"

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("last30days")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [userTableSize, setUserTableSize] = useState<number>(30)
  const itemsPerPage = 100

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      const newBotSelection = event.detail
      console.log("🔄 Chats: Bot selection changed to:", newBotSelection)
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

  // Load user preferences and bot data
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          // Get user table size preference
          const { data: profile } = await supabase.from("user_profiles").select("table_size").eq("id", user.id).single()

          if (profile?.table_size) {
            setUserTableSize(profile.table_size)
            // Map table_size to time period
            if (profile.table_size === 1) {
              setTimePeriod("today")
            } else if (profile.table_size === 30) {
              setTimePeriod("last30days")
            } else if (profile.table_size === 90) {
              setTimePeriod("last90days")
            } else {
              setTimePeriod("alltime")
            }
          }
        }
      } catch (error) {
        console.error("Error loading user preferences:", error)
      }
    }

    loadUserPreferences()
  }, [])

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

  // Load threads data
  useEffect(() => {
    const loadThreads = async () => {
      if (!selectedBot) {
        setThreads([])
        setTotalCount(0)
        setLoading(false)
        return
      }

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
            const sevenDaysAgo = new Date(now)
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            startDate = sevenDaysAgo.toISOString()
            break
          case "last30days":
            const thirtyDaysAgo = new Date(now)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            startDate = thirtyDaysAgo.toISOString()
            break
          case "last90days":
            const ninetyDaysAgo = new Date(now)
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
            startDate = ninetyDaysAgo.toISOString()
            break
          case "alltime":
            startDate = null
            break
        }

        // Build base query
        let query = supabase
          .from("threads")
          .select(`
            *,
            callbacks!callbacks_id_fkey(
              user_name,
              user_first_name,
              user_surname,
              user_email
            )
          `)
          .eq("bot_share_name", selectedBot)
          .gt("count", 0)
          .order("created_at", { ascending: false })

        // Apply date filter
        if (startDate) {
          query = query.gte("created_at", startDate)
        }

        // Apply filter
        if (filter === "callbacks") {
          // Only threads with callback records
          query = query.not("callbacks", "is", null)
        } else if (filter === "dropped_callbacks") {
          // Threads with callback=true but no callback record
          query = query.eq("callback", true).is("callbacks", null)
        } else if (filter === "user_messages") {
          // Get thread IDs that have user messages
          const { data: userMessageThreads } = await supabase
            .from("messages")
            .select("thread_id")
            .eq("role", "user")
            .eq("bot_share_name", selectedBot)

          if (userMessageThreads && userMessageThreads.length > 0) {
            const threadIds = [...new Set(userMessageThreads.map((m) => m.thread_id).filter(Boolean))]
            query = query.in("id", threadIds)
          } else {
            // No user messages found, return empty result
            setThreads([])
            setTotalCount(0)
            setLoading(false)
            return
          }
        }

        // Get total count first
        const countQuery = query
        const { count } = await countQuery.select("*", { count: "exact", head: true })
        setTotalCount(count || 0)

        // Get paginated data
        const offset = (currentPage - 1) * itemsPerPage
        const { data: threadsData, error } = await query.range(offset, offset + itemsPerPage - 1)

        if (error) {
          console.error("Error fetching threads:", error)
          setThreads([])
        } else {
          setThreads(threadsData || [])
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
  }, [selectedBot, filter, timePeriod, currentPage])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    }
  }

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

  if (!selectedBot) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
          <p className="text-[#616161]">View and manage chat conversations</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Please select a bot to view chats.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
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
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dynamic Subheading */}
        {botData && (
          <p className="text-sm text-[#616161]">
            Showing threads on <span className="font-medium">{botData.client_name}</span> in {getTimePeriodLabel()}
            {getFilterLabel()}
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
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
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
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Callback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Message Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Avg. Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e0e0e0]">
                {threads.map((thread) => (
                  <tr key={thread.id} className="hover:bg-gray-50">
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      {formatDate(thread.created_at)}
                    </td>

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
                          className="flex items-center gap-2 cursor-help"
                          title={thread.sentiment_justification || "No justification available"}
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
                        className="text-[#038a71] hover:underline max-w-xs truncate block"
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
