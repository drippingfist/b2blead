"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Star,
  Phone,
  MessageSquare,
  RefreshCw,
  Timer,
  User,
  Check,
  Calendar,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { formatTimeInTimezone, formatDateOnlyInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"
import { refreshSentimentAnalysis } from "@/lib/actions"
import { toggleThreadStarred } from "@/lib/simple-database"
import Link from "next/link"
import type { Bot, Thread } from "@/lib/database"

// Define filter types
type FilterType = "all" | "callbacks" | "dropped_callbacks" | "user_messages"
type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"

// Define filter options
const FILTER_OPTIONS = [
  { value: "all" as FilterType, label: "All Threads" },
  { value: "callbacks" as FilterType, label: "Callbacks" },
  { value: "dropped_callbacks" as FilterType, label: "Dropped Callbacks" },
  { value: "user_messages" as FilterType, label: "User Messages" },
]

const TIME_PERIOD_OPTIONS = [
  { value: "today" as TimePeriod, label: "Today" },
  { value: "last7days" as TimePeriod, label: "Last 7 days" },
  { value: "last30days" as TimePeriod, label: "Last 30 days" },
  { value: "last90days" as TimePeriod, label: "Last 90 days" },
  { value: "alltime" as TimePeriod, label: "All Time" },
]

interface ThreadWithCallback extends Thread {
  callbacks?: {
    user_name?: string
    user_first_name?: string
    user_surname?: string
    user_email?: string
  } | null
}

interface ChatsPageClientProps {
  bots: Bot[]
}

export default function ChatsPageClient({ bots }: ChatsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State variables
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [selectedBotName, setSelectedBotName] = useState<string | null>(null)
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all")
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last30days")
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [threads, setThreads] = useState<ThreadWithCallback[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(100)
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [refreshingSentiment, setRefreshingSentiment] = useState<string | null>(null)
  const [starringSentiment, setStarringSentiment] = useState<string | null>(null)
  const [userPreferences, setUserPreferences] = useState<{
    time_period?: string
    table_size?: number
  }>({})

  // Load selected bot from localStorage on component mount
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)

      // Find bot name
      const bot = bots.find((b) => b.bot_share_name === storedBot)
      if (bot) {
        setSelectedBotName(bot.client_name || bot.bot_share_name)
      }
    }

    // Load user preferences
    loadUserPreferences()
  }, [bots])

  // Load user preferences from database
  const loadUserPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("time_period, table_size")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          setUserPreferences(data)

          // Set time period from user preferences if available
          if (data.time_period) {
            let timePeriod: TimePeriod = "last30days"

            switch (data.time_period) {
              case "today":
                timePeriod = "today"
                break
              case "7":
                timePeriod = "last7days"
                break
              case "30":
                timePeriod = "last30days"
                break
              case "90":
                timePeriod = "last90days"
                break
              case "ALL":
                timePeriod = "alltime"
                break
            }

            setCurrentTimePeriod(timePeriod)
          }
        }
      }
    } catch (error) {
      console.error("Error loading user preferences:", error)
    }
  }

  // Load threads when selected bot or filters change
  useEffect(() => {
    if (selectedBot) {
      loadThreads()
    }
  }, [selectedBot, currentFilter, currentTimePeriod, currentPage])

  // Function to build date filter for SQL query
  const getDateFilterForPeriod = (period: TimePeriod): string | null => {
    const now = new Date()

    switch (period) {
      case "today":
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return today.toISOString()
      case "last7days":
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return sevenDaysAgo.toISOString()
      case "last30days":
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return thirtyDaysAgo.toISOString()
      case "last90days":
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        return ninetyDaysAgo.toISOString()
      case "alltime":
        return null
      default:
        return null
    }
  }

  // Load threads from database
  const loadThreads = async () => {
    setLoading(true)

    try {
      // Calculate pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      // Build base query
      let query = supabase
        .from("threads")
        .select("*, callbacks(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      // Apply bot filter if selected
      if (selectedBot) {
        query = query.eq("bot_share_name", selectedBot)
      }

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(currentTimePeriod)
      if (dateFilter) {
        query = query.gte("created_at", dateFilter)
      }

      // Apply filter type
      if (currentFilter === "callbacks") {
        // Only show threads with callbacks
        query = query.not("callbacks", "is", null)
      } else if (currentFilter === "dropped_callbacks") {
        // Show threads where callback=true but no callback record exists
        query = query.eq("callback", true).is("callbacks", null)
      } else if (currentFilter === "user_messages") {
        // This requires a more complex query with a join
        // We'll need to get thread IDs with user messages first
        const { data: threadIdsWithUserMessages } = await supabase
          .from("messages")
          .select("thread_id")
          .eq("role", "user")
          .eq("bot_share_name", selectedBot || "")

        if (threadIdsWithUserMessages && threadIdsWithUserMessages.length > 0) {
          const threadIds = [...new Set(threadIdsWithUserMessages.map((m) => m.thread_id))]
          query = query.in("thread_id", threadIds)
        } else {
          // No threads with user messages
          setThreads([])
          setTotalCount(0)
          setLoading(false)
          return
        }
      }

      // Execute query
      const { data, error, count } = await query

      if (error) {
        console.error("Error fetching threads:", error)
        setThreads([])
        setTotalCount(0)
      } else {
        setThreads(data || [])
        setTotalCount(count || 0)
      }
    } catch (error) {
      console.error("Exception while fetching threads:", error)
      setThreads([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter)
    setFilterDropdownOpen(false)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  // Handle time period change
  const handleTimePeriodChange = (period: TimePeriod) => {
    setCurrentTimePeriod(period)
    setTimePeriodDropdownOpen(false)
    setCurrentPage(1) // Reset to first page when time period changes
  }

  // Handle refresh
  const handleRefresh = () => {
    loadThreads()
  }

  // Handle pagination
  const handleNextPage = () => {
    if (currentPage * pageSize < totalCount) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Handle sentiment hover
  const handleSentimentHover = (threadId: string, justification: string | null, event: React.MouseEvent) => {
    if (justification) {
      setHoveredSentiment(threadId)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleSentimentLeave = () => {
    setHoveredSentiment(null)
  }

  // Handle sentiment refresh
  const handleSentimentRefresh = async (threadId: string) => {
    try {
      setRefreshingSentiment(threadId)

      // Update local state to show null immediately
      setThreads((prevThreads) =>
        prevThreads.map((thread) =>
          thread.id === threadId ? { ...thread, sentiment_score: null, sentiment_justification: null } : thread,
        ),
      )

      // Call the server action
      await refreshSentimentAnalysis(threadId)

      // Wait 2 seconds, then fetch just the updated sentiment data
      setTimeout(async () => {
        try {
          // Fetch only the updated thread's sentiment data
          const { data: updatedThread, error } = await supabase
            .from("threads")
            .select("sentiment_score, sentiment_justification")
            .eq("id", threadId)
            .single()

          if (!error && updatedThread) {
            // Update only this thread's sentiment in local state
            setThreads((prevThreads) =>
              prevThreads.map((thread) =>
                thread.id === threadId
                  ? {
                      ...thread,
                      sentiment_score: updatedThread.sentiment_score,
                      sentiment_justification: updatedThread.sentiment_justification,
                    }
                  : thread,
              ),
            )
          }
        } catch (error) {
          console.error("Error fetching updated sentiment:", error)
        }
      }, 2000)
    } catch (error) {
      console.error("Error refreshing sentiment:", error)
    } finally {
      // Clear the refreshing state after 2 seconds
      setTimeout(() => {
        setRefreshingSentiment(null)
      }, 2000)
    }
  }

  // Handle star toggle
  const handleStarToggle = async (threadId: string) => {
    try {
      setStarringSentiment(threadId)

      // Optimistically update the UI
      setThreads((prevThreads) =>
        prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
      )

      // Call the API to toggle starred status
      const result = await toggleThreadStarred(threadId)

      if (!result.success) {
        // Revert the optimistic update on error
        setThreads((prevThreads) =>
          prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
        )
        console.error("Failed to toggle star:", result.error)
      }
    } catch (error) {
      // Revert the optimistic update on error
      setThreads((prevThreads) =>
        prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
      )
      console.error("Error toggling star:", error)
    } finally {
      setStarringSentiment(null)
    }
  }

  // Helper functions for UI
  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment === 5) return "😍" // 5 = very happy
    if (sentiment === 4) return "😊" // 4 = happy
    if (sentiment === 3) return "😐" // 3 = neutral
    if (sentiment === 2) return "😞" // 2 = sad
    return "😡" // 1 = angry
  }

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "text-gray-500"
    if (sentiment >= 4) return "text-green-600" // 4 or 5 = green
    if (sentiment === 3) return "text-yellow-600" // 3 = yellow
    if (sentiment === 2) return "text-orange-600" // 2 = orange
    return "text-red-600" // 1 = red
  }

  // Format callback information
  const formatCallback = (
    callback?: {
      user_name?: string
      user_first_name?: string
      user_surname?: string
      user_email?: string
    } | null,
  ) => {
    if (!callback) {
      return { name: "-", email: "" }
    }

    let name = "-"

    if (callback.user_name) {
      name = callback.user_name
    } else if (callback.user_first_name || callback.user_surname) {
      const firstName = callback.user_first_name || ""
      const lastName = callback.user_surname || ""
      name = `${firstName} ${lastName}`.trim()
    }

    return {
      name: name || "-",
      email: callback.user_email || "",
    }
  }

  // Format duration
  const formatDuration = (duration?: string) => {
    if (!duration) return "00:00:00"

    // Parse PostgreSQL interval format
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (match) {
      const [, hours, minutes, seconds] = match
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
    }

    return duration
  }

  // Format mean response time from ms to seconds with 2 decimal places
  const formatMeanResponseTime = (meanResponseTime?: number) => {
    if (meanResponseTime === undefined || meanResponseTime === null) return "N/A"
    const seconds = meanResponseTime / 1000
    return `${seconds.toFixed(2)}s`
  }

  // Get timezone for the selected bot or default to Asia/Bangkok
  const getSelectedBotTimezone = (): string => {
    if (!selectedBot || !bots?.length) return "Asia/Bangkok" // Default
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone || "Asia/Bangkok"
  }

  const displayTimezone = getSelectedBotTimezone()
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone)

  // Calculate pagination display
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Get filter label
  const getFilterLabel = () => {
    return FILTER_OPTIONS.find((option) => option.value === currentFilter)?.label || "All Threads"
  }

  // Get time period label
  const getTimePeriodLabel = () => {
    return TIME_PERIOD_OPTIONS.find((option) => option.value === currentTimePeriod)?.label || "Last 30 days"
  }

  // Group threads by date
  const groupedThreads = threads.reduce((groups: { [key: string]: ThreadWithCallback[] }, thread) => {
    const date = formatDateOnlyInTimezone(thread.created_at, displayTimezone)

    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(thread)
    return groups
  }, {})

  return (
    <div className="p-4 md:p-8 pt-0 relative">
      {/* Tooltip */}
      {hoveredSentiment && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
        >
          {threads.find((t) => t.id === hoveredSentiment)?.sentiment_justification}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#212121] mb-2">Chats</h1>
        <p className="text-[#616161]">
          {selectedBot
            ? `Showing threads for ${selectedBotName} from ${getTimePeriodLabel()}`
            : "Showing threads from " + getTimePeriodLabel()}
          {currentFilter !== "all" && `, filtered by ${getFilterLabel().toLowerCase()}`}
          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2 w-full border border-[#e0e0e0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#038a71]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 text-[#616161] mr-2" />
              <span className="text-sm text-[#212121]">{getFilterLabel()}</span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {filterDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[180px]">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    disabled={loading}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                      currentFilter === option.value ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {currentFilter === option.value && <Check className="h-4 w-4 text-[#038a71]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Period Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTimePeriodDropdownOpen(!timePeriodDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-[#616161] mr-2" />
              <span className="text-sm text-[#212121]">{getTimePeriodLabel()}</span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {timePeriodDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[150px]">
                {TIME_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimePeriodChange(option.value)}
                    disabled={loading}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                      currentTimePeriod === option.value ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {currentTimePeriod === option.value && <Check className="h-4 w-4 text-[#038a71]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleRefresh} disabled={loading} variant="outline" className="w-full md:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#616161]">
          {totalCount > 0 ? `${startItem} - ${endItem} of ${totalCount}` : "No threads found"}
        </div>
        <div className="flex items-center space-x-2">
          <button
            className={`p-1 rounded-md ${currentPage > 1 ? "hover:bg-gray-100 text-[#616161]" : "text-gray-300 cursor-not-allowed"}`}
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className={`p-1 rounded-md ${endItem < totalCount ? "hover:bg-gray-100 text-[#616161]" : "text-gray-300 cursor-not-allowed"}`}
            onClick={handleNextPage}
            disabled={endItem >= totalCount}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#038a71]"></div>
          <span className="ml-2 text-[#616161]">Loading threads...</span>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">Start Time</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Callback
                  <User className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Sentiment
                  <Info className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Message Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">Messages</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Avg. Response Time
                  <Info className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedThreads).length > 0 ? (
              Object.entries(groupedThreads).map(([date, dateThreads]) => (
                <>
                  <tr key={`date-${date}`} className="bg-gray-50">
                    <td colSpan={7} className="px-6 py-2 text-sm font-medium text-[#616161]">
                      {date}
                    </td>
                  </tr>
                  {dateThreads.map((thread) => {
                    const callbackInfo = formatCallback(thread.callbacks)
                    return (
                      <tr key={thread.id} className="bg-white hover:bg-[#f5f5f5] border-t border-[#e0e0e0]">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          {formatTimeInTimezone(thread.created_at, displayTimezone)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {callbackInfo.name === "-" ? (
                            <span className="text-[#616161]">-</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-[#212121] font-medium">{callbackInfo.name}</span>
                              {callbackInfo.email && (
                                <span className="text-[#616161] text-xs">{callbackInfo.email}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className="flex items-center cursor-pointer"
                            onMouseEnter={(e) => handleSentimentHover(thread.id, thread.sentiment_justification, e)}
                            onMouseLeave={handleSentimentLeave}
                            onMouseMove={(e) => {
                              if (hoveredSentiment === thread.id) {
                                setTooltipPosition({ x: e.clientX, y: e.clientY })
                              }
                            }}
                          >
                            <span className="text-xl">{getSentimentEmoji(thread.sentiment_score)}</span>
                            <span className={`ml-2 text-sm font-medium ${getSentimentColor(thread.sentiment_score)}`}>
                              {thread.sentiment_score !== undefined && thread.sentiment_score !== null
                                ? thread.sentiment_score
                                : "N/A"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSentimentRefresh(thread.id)
                              }}
                              disabled={refreshingSentiment === thread.id}
                              className="ml-2 p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              title="Refresh sentiment analysis"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${refreshingSentiment === thread.id ? "animate-spin" : ""}`}
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-sm text-[#212121]">
                          <Link href={`/thread/${thread.id}`} className="hover:text-[#038a71] cursor-pointer">
                            {thread.message_preview || "No preview available"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <Link
                            href={`/thread/${thread.id}`}
                            className="flex items-center hover:text-[#038a71] cursor-pointer"
                          >
                            <MessageSquare className="h-4 w-4 text-[#616161] mr-1" />
                            {thread.count || 0}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                          <Link
                            href={`/thread/${thread.id}`}
                            className="flex items-center hover:text-[#038a71] cursor-pointer"
                          >
                            <Timer className="h-4 w-4 text-[#616161] mr-1" />
                            {formatMeanResponseTime(thread.mean_response_time)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {thread.callback && <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />}
                            <Link href={`/thread/${thread.id}`}>
                              <MessageSquare className="h-4 w-4 text-[#616161] hover:text-[#212121]" />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStarToggle(thread.id)
                              }}
                              disabled={starringSentiment === thread.id}
                              className="text-[#616161] hover:text-[#212121] disabled:opacity-50"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  thread.starred
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-[#616161] hover:text-[#212121]"
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-[#616161] mb-4" />
                    <p className="text-[#616161] mb-2">No chats found.</p>
                    <p className="text-sm text-[#616161]">
                      {selectedBot
                        ? `No chat threads found for ${selectedBotName} with the current filters.`
                        : `No chat threads found with the current filters.`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {Object.entries(groupedThreads).length > 0 ? (
          Object.entries(groupedThreads).map(([date, dateThreads]) => (
            <div key={`mobile-date-${date}`}>
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-[#616161] rounded-t-md border border-[#e0e0e0]">
                {date}
              </div>
              <div className="space-y-2">
                {dateThreads.map((thread) => {
                  const callbackInfo = formatCallback(thread.callbacks)
                  return (
                    <div
                      key={`mobile-${thread.id}`}
                      className="bg-white border border-[#e0e0e0] border-t-0 last:rounded-b-md p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-[#212121]">
                            {formatTimeInTimezone(thread.created_at, displayTimezone)}
                          </span>
                          <div
                            className="flex items-center cursor-pointer"
                            onMouseEnter={(e) => handleSentimentHover(thread.id, thread.sentiment_justification, e)}
                            onMouseLeave={handleSentimentLeave}
                            onMouseMove={(e) => {
                              if (hoveredSentiment === thread.id) {
                                setTooltipPosition({ x: e.clientX, y: e.clientY })
                              }
                            }}
                          >
                            <span className="text-xl">{getSentimentEmoji(thread.sentiment_score)}</span>
                            <span className={`ml-1 text-sm font-medium ${getSentimentColor(thread.sentiment_score)}`}>
                              {thread.sentiment_score !== undefined && thread.sentiment_score !== null
                                ? thread.sentiment_score
                                : "N/A"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSentimentRefresh(thread.id)
                              }}
                              disabled={refreshingSentiment === thread.id}
                              className="ml-1 p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              title="Refresh sentiment analysis"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${refreshingSentiment === thread.id ? "animate-spin" : ""}`}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {thread.callback && <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStarToggle(thread.id)
                            }}
                            disabled={starringSentiment === thread.id}
                            className="text-[#616161] hover:text-[#212121] disabled:opacity-50"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                thread.starred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-[#616161] hover:text-[#212121]"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Callback info in mobile */}
                      <div className="mb-2">
                        <span className="text-xs text-[#616161] uppercase tracking-wider">Callback:</span>
                        {callbackInfo.name === "-" ? (
                          <span className="ml-2 text-sm text-[#616161]">-</span>
                        ) : (
                          <div className="mt-1">
                            <div className="text-sm font-medium text-[#212121]">{callbackInfo.name}</div>
                            {callbackInfo.email && <div className="text-xs text-[#616161]">{callbackInfo.email}</div>}
                          </div>
                        )}
                      </div>

                      <Link href={`/thread/${thread.id}`} className="block">
                        <div className="text-sm text-[#212121] mb-2 hover:text-[#038a71] cursor-pointer">
                          {thread.message_preview || "No preview available"}
                        </div>
                      </Link>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-[#616161] flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {thread.count || 0}
                          </span>
                          <span className="text-[#616161] flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            {formatMeanResponseTime(thread.mean_response_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-[#e0e0e0] rounded-md p-8 text-center">
            <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
            <p className="text-[#616161]">No threads found with the current filters.</p>
          </div>
        )}
      </div>

      {/* Bottom Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-[#616161]">
            {totalCount > 0 ? `${startItem} - ${endItem} of ${totalCount}` : "No threads found"}
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`p-1 rounded-md ${currentPage > 1 ? "hover:bg-gray-100 text-[#616161]" : "text-gray-300 cursor-not-allowed"}`}
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className={`p-1 rounded-md ${endItem < totalCount ? "hover:bg-gray-100 text-[#616161]" : "text-gray-300 cursor-not-allowed"}`}
              onClick={handleNextPage}
              disabled={endItem >= totalCount}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
