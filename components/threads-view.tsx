"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  Star,
  MoreVertical,
  Phone,
  Clock,
  MessageSquare,
  RefreshCw,
  Timer,
  User,
  Check,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { Thread, Bot } from "@/lib/database"
import Link from "next/link"
import { formatTimeInTimezone, formatDateOnlyInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"
import { refreshSentimentAnalysis } from "@/lib/actions"
import { toggleThreadStarred } from "@/lib/simple-database"
import { supabase } from "@/lib/supabase/client"

interface ThreadsViewProps {
  initialThreads: Thread[]
  selectedBot?: string | null
  onRefresh?: () => void
  bots?: Bot[] // Add bots prop to get timezone info
  totalCount?: number // Add totalCount prop
  selectedTimePeriod?: string // Add selectedTimePeriod prop
}

interface ThreadWithMessageCount extends Thread {
  // count column already exists in Thread interface
  callbacks?: {
    user_name?: string
    user_first_name?: string
    user_surname?: string
    user_email?: string
  } | null
}

type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"
type DateFilter = "today" | "last7days" | "last30days" | "alltime"

const TIME_PERIOD_OPTIONS = [
  { value: "today" as TimePeriod, label: "Today" },
  { value: "last7days" as TimePeriod, label: "Last 7 days" },
  { value: "last30days" as TimePeriod, label: "Last 30 days" },
  { value: "last90days" as TimePeriod, label: "Last 90 days" },
  { value: "alltime" as TimePeriod, label: "All Time" },
]

export default function ThreadsView({
  initialThreads = [], // Add default value to prevent undefined
  selectedBot,
  onRefresh,
  bots = [], // Add default value to prevent undefined
  totalCount = 0, // Add default value to prevent undefined
  selectedTimePeriod = "last30days", // Add default value to prevent undefined
}: ThreadsViewProps) {
  // Debug logging
  console.log("[ThreadsView] Props received:", {
    initialThreadsLength: initialThreads?.length || 0,
    selectedBot,
    botsLength: bots?.length || 0,
    totalCount,
    selectedTimePeriod,
  })

  const [threads, setThreads] = useState<ThreadWithMessageCount[]>([])
  const [threadIdEnabled, setThreadIdEnabled] = useState(false) // Hidden by default
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [refreshingSentiment, setRefreshingSentiment] = useState<string | null>(null)
  const [starringSentiment, setStarringSentiment] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [dateFilter, setDateFilter] = useState<DateFilter>("last30days")
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  // NEW: Time Period Selector State
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last30days")
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [currentThreadCount, setCurrentThreadCount] = useState(0)
  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setDateDropdownOpen(false)
      }
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setTimePeriodDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // NEW: Function to build date filter for SQL query
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

  // NEW: Function to reload threads based on time period and bot selection
  const reloadThreadsForTimePeriod = async (period: TimePeriod) => {
    setLoading(true)
    console.log("🔄 Reloading threads for period:", period, "and bot:", selectedBot || "ALL")

    try {
      // Build the query
      let query = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(50)

      // Apply bot filter if selected
      if (selectedBot) {
        query = query.eq("bot_share_name", selectedBot)
      }

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(period)
      if (dateFilter) {
        query = query.gte("created_at", dateFilter)
      }

      console.log("📊 Executing query with filters:", {
        bot: selectedBot || "ALL",
        period,
        dateFilter,
      })

      const { data, error } = await query

      if (error) {
        console.error("❌ Error fetching threads:", error)
        setThreads([])
        setCurrentThreadCount(0)
        return
      }

      console.log("✅ Successfully fetched", data?.length || 0, "threads")
      setThreads(data || [])
      setCurrentThreadCount(data?.length || 0)
    } catch (error) {
      console.error("❌ Exception while fetching threads:", error)
      setThreads([])
      setCurrentThreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  // NEW: Handle time period change
  const handleTimePeriodChange = async (period: TimePeriod) => {
    setCurrentTimePeriod(period)
    setTimePeriodDropdownOpen(false)
    await reloadThreadsForTimePeriod(period)
  }

  // Initialize with current time period on mount
  useEffect(() => {
    reloadThreadsForTimePeriod(currentTimePeriod)
  }, [selectedBot]) // Reload when bot changes

  const filterThreadsByDate = (threads: ThreadWithMessageCount[], filter: DateFilter): ThreadWithMessageCount[] => {
    if (!threads) return [] // Safety check
    if (filter === "alltime") return threads

    const now = new Date()
    let cutoffDate: Date

    switch (filter) {
      case "today":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "last7days":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "last30days":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        return threads
    }

    return threads.filter((thread) => new Date(thread.created_at) >= cutoffDate)
  }

  // Calculate the count based on the selected date filter
  const getFilteredCount = (): number => {
    return currentThreadCount // Use the actual count from the SQL query
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New column, default to descending
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const sortThreads = (threads: ThreadWithMessageCount[]) => {
    if (!sortColumn || !threads) return threads

    return [...threads].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "time":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "messages":
          aValue = a.count || 0
          bValue = b.count || 0
          break
        case "duration":
          // Parse duration string to seconds for comparison
          aValue = parseDurationToSeconds(a.duration)
          bValue = parseDurationToSeconds(b.duration)
          break
        case "response_time":
          aValue = a.mean_response_time || 0
          bValue = b.mean_response_time || 0
          break
        default:
          return 0
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  const parseDurationToSeconds = (duration?: string): number => {
    if (!duration) return 0
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (match) {
      const [, hours, minutes, seconds] = match
      return Number.parseInt(hours) * 3600 + Number.parseInt(minutes) * 60 + Number.parseInt(seconds)
    }
    return 0
  }

  // Process threads when initialThreads changes
  // useEffect(() => {
  //   if (!initialThreads) {
  //     console.warn("[ThreadsView] initialThreads is undefined, setting empty array")
  //     setThreads([])
  //     return
  //   }

  //   // Sort threads by created_at in descending order (newest first)
  //   const sortedThreads = [...initialThreads].sort(
  //     (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  //   )
  //   setThreads(sortedThreads)
  // }, [initialThreads, bots, selectedBot])

  // Get timezone for the selected bot or default to Asia/Bangkok for superadmin
  const getSelectedBotTimezone = (): string | undefined => {
    if (!selectedBot || !bots?.length) return "Asia/Bangkok" // Default for superadmin
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone || "Asia/Bangkok"
  }

  const displayTimezone = getSelectedBotTimezone()
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone)

  // Apply sorting and grouping to current threads
  const sortedThreads = sortThreads(threads || [])

  // Safety check before grouping
  const groupedThreads = sortedThreads
    ? sortedThreads.reduce((groups: { [key: string]: ThreadWithMessageCount[] }, thread) => {
        const date = formatDateOnlyInTimezone(thread.created_at, displayTimezone)

        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(thread)
        return groups
      }, {})
    : {}

  // Filter threads based on search query
  const filteredThreads =
    searchQuery && sortedThreads
      ? sortedThreads.filter(
          (thread) =>
            thread.message_preview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.thread_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.sentiment_justification?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : sortedThreads || []

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 4) return "😊" // 4 or 5 = smiley
    if (sentiment === 3) return "😐" // 3 = straight face
    return "😞" // 1 or 2 = sad face
  }

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "text-gray-500"
    if (sentiment >= 4) return "text-green-600" // 4 or 5 = green
    if (sentiment === 3) return "text-yellow-600" // 3 = yellow
    return "text-red-600" // 1 or 2 = red
  }

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

  // Format callback information - now expects a single callback object or null
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

  const handleSentimentHover = (threadId: string, justification: string | null, event: React.MouseEvent) => {
    if (justification) {
      setHoveredSentiment(threadId)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleSentimentLeave = () => {
    setHoveredSentiment(null)
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    } else {
      // If no onRefresh prop, reload with current settings
      await reloadThreadsForTimePeriod(currentTimePeriod)
    }
  }

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
      const result = await refreshSentimentAnalysis(threadId)

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
    } catch (error: any) {
      // Silent error handling
    } finally {
      // Clear the refreshing state after 2 seconds
      setTimeout(() => {
        setRefreshingSentiment(null)
      }, 2000)
    }
  }

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
    } catch (error: any) {
      // Revert the optimistic update on error
      setThreads((prevThreads) =>
        prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
      )
      console.error("Error toggling star:", error)
    } finally {
      setStarringSentiment(null)
    }
  }

  // Get the selected bot's client name for display
  const getSelectedBotName = () => {
    if (!selectedBot || !bots?.length) return null
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.client_name || bot?.bot_share_name || selectedBot
  }

  const selectedBotName = getSelectedBotName()

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ChevronDown className="h-4 w-4 ml-1 text-gray-300" />
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1 text-[#038a71]" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 text-[#038a71]" />
    )
  }

  const getCurrentTimePeriodLabel = () => {
    return TIME_PERIOD_OPTIONS.find((option) => option.value === currentTimePeriod)?.label || "Last 30 days"
  }

  // Get the time period label from TIME_PERIODS
  // const getTimePeriodLabel = () => {
  //   if (!TIME_PERIODS) return "Last 30 days"
  //   const period = TIME_PERIODS.find((p) => p.value === selectedTimePeriod)
  //   return period?.label || "Last 30 days"
  // }

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

      {/* NEW: Debug Box */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">🔍 Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="font-medium text-blue-700">Selected Bot:</span>
            <span className="ml-2 text-blue-600">{selectedBot || "All Bots"}</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Time Period:</span>
            <span className="ml-2 text-blue-600">{getCurrentTimePeriodLabel()}</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Query Result Count:</span>
            <span className="ml-2 text-blue-600">{currentThreadCount} threads</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="mb-6">
          <p className="text-[#616161]">
            {selectedBot ? `Showing threads for ${selectedBotName}` : "Showing threads"} from{" "}
            {getCurrentTimePeriodLabel()} ({currentThreadCount} total)
            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
          </p>
        </div>
        <div className="flex space-x-2">
          {/* NEW: Time Period Selector */}
          <div className="relative" ref={timePeriodDropdownRef}>
            <button
              onClick={() => setTimePeriodDropdownOpen(!timePeriodDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-[#616161] mr-2" />
              <span className="text-sm text-[#212121]">{getCurrentTimePeriodLabel()}</span>
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

          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            className="w-full md:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? "animate-spin" : ""}`} />
            {refreshing || loading ? "Loading..." : "Refresh"}
          </Button>
          <Button className="bg-[#038a71] hover:bg-[#038a71]/90 w-full md:w-auto">Export</Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2 w-full border border-[#e0e0e0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#038a71]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-[#616161] mr-2" />
            <span className="text-sm text-[#616161]">Filters</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

          {/* Date Filter Dropdown */}
          {/* <div className="relative" ref={dateDropdownRef}>
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-[#616161]">{getCurrentDateFilterLabel()}</span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {dateDropdownOpen && dateFilterOptions && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[150px]">
                {dateFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateFilter(option.value)
                      setDateDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      dateFilter === option.value ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {dateFilter === option.value && <Check className="h-4 w-4 text-[#038a71]" />}
                  </button>
                ))}
              </div>
            )}
          </div> */}

          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-sm text-[#616161]">
              1 - {Math.min(50, filteredThreads.length)} of {filteredThreads.length}
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-[#616161]" />
              </button>
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronRight className="h-5 w-5 text-[#616161]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile pagination */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <div className="text-sm text-[#616161]">
          1 - {Math.min(50, filteredThreads.length)} of {filteredThreads.length}
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded-md hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-[#616161]" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100">
            <ChevronRight className="h-5 w-5 text-[#616161]" />
          </button>
        </div>
      </div>

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
                <button
                  onClick={() => handleSort("time")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                >
                  START TIME
                  {renderSortIcon("time")}
                </button>
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
                <button
                  onClick={() => handleSort("messages")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                >
                  Messages
                  {renderSortIcon("messages")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <button
                  onClick={() => handleSort("duration")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                >
                  Duration
                  {renderSortIcon("duration")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <button
                  onClick={() => handleSort("response_time")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                >
                  Avg. Response Time
                  <Info className="h-4 w-4 ml-1 text-[#616161]" />
                  {renderSortIcon("response_time")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>Actions</span>
                  {threadIdEnabled && (
                    <Switch checked={threadIdEnabled} onCheckedChange={setThreadIdEnabled} className="ml-2" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedThreads).length > 0 ? (
              Object.entries(groupedThreads).map(([date, dateThreads]) => (
                <>
                  <tr key={`date-${date}`} className="bg-gray-50">
                    <td colSpan={8} className="px-6 py-2 text-sm font-medium text-[#616161]">
                      {date}
                    </td>
                  </tr>
                  {dateThreads.map((thread, index) => {
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
                            <Clock className="h-4 w-4 text-[#616161] mr-1" />
                            {formatDuration(thread.duration)}
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
                            {thread.cb_requested && (
                              <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />
                            )}
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
                <td colSpan={8} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-[#616161] mb-4" />
                    <p className="text-[#616161] mb-2">No chats found.</p>
                    <p className="text-sm text-[#616161]">
                      {selectedBot
                        ? `No chat threads found for ${selectedBotName} in the selected time period.`
                        : `No chat threads found for any of your accessible bots in the selected time period.`}
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
                          {thread.cb_requested && (
                            <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />
                          )}
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
                          <button className="text-[#616161] hover:text-[#212121]">
                            <MoreVertical className="h-4 w-4" />
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
                            {thread.count || 0} messages
                          </span>
                          <span className="text-[#616161] flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDuration(thread.duration)}
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
            <p className="text-[#616161]">No threads found for the selected time period.</p>
          </div>
        )}
      </div>

      {filteredThreads.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-[#616161]">No conversations found matching your search in the selected time period.</p>
        </div>
      )}
    </div>
  )
}
