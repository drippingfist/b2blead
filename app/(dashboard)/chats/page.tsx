"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
  Clock,
  Timer,
  User,
  Check,
  Calendar,
  Filter,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getUserBotAccess, getAccessibleBotsClient } from "@/lib/database"
import { formatTimeInTimezone, formatDateOnlyInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"
import { toggleThreadStarred } from "@/lib/simple-database"
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
  } | null
}

interface Bot {
  id: string
  bot_share_name?: string
  client_name?: string
  timezone?: string
}

interface UserProfile {
  table_size?: number
  time_period?: string
}

type FilterType = "all" | "dropped_callbacks" | "user_messages"
type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"
type TableSize = 50 | 100 | 200

const FILTER_OPTIONS = [
  { value: "all" as FilterType, label: "All Threads" },
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

const TABLE_SIZE_OPTIONS = [
  { value: 50 as TableSize, label: "50" },
  { value: 100 as TableSize, label: "100" },
  { value: 200 as TableSize, label: "200" },
]

export default function ChatsPage() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })

  // Filter states
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all")
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last30days")
  const [currentTableSize, setCurrentTableSize] = useState<TableSize>(50)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [tableSizeDropdownOpen, setTableSizeDropdownOpen] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [starringSentiment, setStarringSentiment] = useState<string | null>(null)

  // Tooltip state
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Load selected bot from localStorage and user access
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load selected bot from localStorage
        const storedBot = localStorage.getItem("selectedBot")
        if (storedBot && storedBot !== "null") {
          setSelectedBot(storedBot)
        }

        // Get user access and bots
        const access = await getUserBotAccess()
        setUserAccess(access)

        if (access.role) {
          const botsData = await getAccessibleBotsClient()
          setBots(botsData)

          // Auto-select single bot for non-superadmin users
          if (botsData.length === 1 && !access.isSuperAdmin && !storedBot) {
            const singleBot = botsData[0]
            setSelectedBot(singleBot.bot_share_name || null)
            localStorage.setItem("selectedBot", singleBot.bot_share_name || "")
          }
        }

        // Load user profile settings
        await loadUserProfile()
      } catch (error: any) {
        console.error("❌ Error initializing chats page:", error)
        setError("Failed to load page data")
      }
    }

    initializeData()
  }, [])

  // Load user profile settings
  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("table_size, time_period")
        .eq("id", user.id)
        .single()

      if (!error && profile) {
        // Set table size
        if (profile.table_size && [50, 100, 200].includes(profile.table_size)) {
          setCurrentTableSize(profile.table_size as TableSize)
        }

        // Set time period based on profile
        if (profile.time_period) {
          switch (profile.time_period) {
            case "today":
              setCurrentTimePeriod("today")
              break
            case "30":
              setCurrentTimePeriod("last30days")
              break
            case "90":
              setCurrentTimePeriod("last90days")
              break
            case "ALL":
              setCurrentTimePeriod("alltime")
              break
            default:
              setCurrentTimePeriod("last30days")
          }
        }
      }
    } catch (error) {
      console.error("❌ Error loading user profile:", error)
    }
  }

  // Load threads when filters change
  useEffect(() => {
    if (userAccess.role) {
      loadThreads()
    }
  }, [selectedBot, currentFilter, currentTimePeriod, currentTableSize, currentPage, userAccess.role])

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      setSelectedBot(event.detail)
      setCurrentPage(1) // Reset to first page when bot changes
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

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

  const loadThreads = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔄 Loading threads with filters:", {
        bot: selectedBot || "ALL",
        filter: currentFilter,
        timePeriod: currentTimePeriod,
        tableSize: currentTableSize,
        page: currentPage,
      })

      // Build the query for threads with callback data
      let query = supabase
        .from("threads")
        .select(`
          *,
          callbacks (
            user_name,
            user_first_name,
            user_surname,
            user_email
          )
        `)
        .order("created_at", { ascending: false })

      // Apply bot filter
      if (selectedBot) {
        query = query.eq("bot_share_name", selectedBot)
      }

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(currentTimePeriod)
      if (dateFilter) {
        query = query.gte("created_at", dateFilter)
      }

      // Apply content filters (placeholder logic for now)
      if (currentFilter === "dropped_callbacks") {
        // Placeholder: threads that requested callback but don't have callback record
        query = query.eq("callback", true)
      } else if (currentFilter === "user_messages") {
        // Placeholder: threads with user messages (could filter by message count > 0)
        query = query.gt("count", 0)
      }

      // Get total count first
      const { count: totalCount } = await supabase
        .from("threads")
        .select("*", { count: "exact", head: true })
        .eq("bot_share_name", selectedBot || "")
        .gte("created_at", dateFilter || "1970-01-01")

      setTotalCount(totalCount || 0)

      // Apply pagination
      const offset = (currentPage - 1) * currentTableSize
      query = query.range(offset, offset + currentTableSize - 1)

      const { data, error } = await query

      if (error) {
        console.error("❌ Error loading threads:", error)
        setError("Failed to load threads")
        setThreads([])
        return
      }

      console.log("✅ Loaded", data?.length || 0, "threads")
      setThreads(data || [])
    } catch (error) {
      console.error("❌ Exception loading threads:", error)
      setError("Failed to load threads")
      setThreads([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter)
    setFilterDropdownOpen(false)
    setCurrentPage(1)
  }

  const handleTimePeriodChange = (period: TimePeriod) => {
    setCurrentTimePeriod(period)
    setTimePeriodDropdownOpen(false)
    setCurrentPage(1)
  }

  const handleTableSizeChange = (size: TableSize) => {
    setCurrentTableSize(size)
    setTableSizeDropdownOpen(false)
    setCurrentPage(1)
  }

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    switch (sentiment) {
      case 1:
        return "😡" // Very angry
      case 2:
        return "😞" // Sad
      case 3:
        return "😐" // Neutral
      case 4:
        return "😊" // Happy
      case 5:
        return "😍" // Very happy
      default:
        return "😐"
    }
  }

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "text-gray-500"
    switch (sentiment) {
      case 1:
        return "text-red-600"
      case 2:
        return "text-orange-500"
      case 3:
        return "text-yellow-600"
      case 4:
        return "text-green-500"
      case 5:
        return "text-green-600"
      default:
        return "text-gray-500"
    }
  }

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

  const formatMeanResponseTime = (meanResponseTime?: number) => {
    if (meanResponseTime === undefined || meanResponseTime === null) return "N/A"
    const seconds = meanResponseTime / 1000
    return `${seconds.toFixed(2)}s`
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

  const handleSentimentHover = (threadId: string, justification: string | null, event: React.MouseEvent) => {
    if (justification) {
      setHoveredSentiment(threadId)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleSentimentLeave = () => {
    setHoveredSentiment(null)
  }

  // Get timezone for the selected bot
  const getSelectedBotTimezone = (): string => {
    if (!selectedBot || !bots?.length) return "Asia/Bangkok"
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone || "Asia/Bangkok"
  }

  const displayTimezone = getSelectedBotTimezone()
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone)

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / currentTableSize)
  const startItem = (currentPage - 1) * currentTableSize + 1
  const endItem = Math.min(currentPage * currentTableSize, totalCount)

  // Show loading state
  if (loading && threads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  // Show access denied if no role
  if (!userAccess.role) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md text-center">
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p>You don't have access to any bots. Please contact an administrator to get access.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error loading chats</h2>
          <p>{error}</p>
          <button
            onClick={() => loadThreads()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 relative">
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
          <p className="text-[#616161]">
            View and manage all your chat conversations with customers.
            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors min-w-[140px]"
            >
              <Filter className="h-4 w-4 text-[#616161] mr-2" />
              <span className="text-sm text-[#212121]">
                {FILTER_OPTIONS.find((f) => f.value === currentFilter)?.label}
              </span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {filterDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[160px]">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
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
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors min-w-[140px]"
            >
              <Calendar className="h-4 w-4 text-[#616161] mr-2" />
              <span className="text-sm text-[#212121]">
                {TIME_PERIOD_OPTIONS.find((p) => p.value === currentTimePeriod)?.label}
              </span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {timePeriodDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[150px]">
                {TIME_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimePeriodChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
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

          {/* Table Size Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTableSizeDropdownOpen(!tableSizeDropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors min-w-[80px]"
            >
              <span className="text-sm text-[#212121]">{currentTableSize}</span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {tableSizeDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-[#e0e0e0] rounded-md shadow-lg min-w-[80px]">
                {TABLE_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTableSizeChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      currentTableSize === option.value ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {currentTableSize === option.value && <Check className="h-4 w-4 text-[#038a71]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#616161]">
          {totalCount > 0 ? `${startItem} - ${endItem} of ${totalCount}` : "0 results"}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 text-[#616161]" />
          </button>
          <span className="text-sm text-[#616161]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5 text-[#616161]" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Callback
                  <User className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Sentiment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Message Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Messages
                  <MessageSquare className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Duration
                  <Clock className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Avg. Response Time
                  <Timer className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {threads.length > 0 ? (
              threads.map((thread) => {
                const callbackInfo = formatCallback(thread.callbacks)
                return (
                  <tr key={thread.id} className="bg-white hover:bg-[#f5f5f5] border-t border-[#e0e0e0]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#212121]">
                        {formatDateOnlyInTimezone(thread.created_at, displayTimezone)}
                      </div>
                      <div className="text-xs text-[#616161]">
                        {formatTimeInTimezone(thread.created_at, displayTimezone)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {callbackInfo.name === "-" ? (
                        <span className="text-[#616161]">-</span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[#212121] font-medium">{callbackInfo.name}</span>
                          {callbackInfo.email && <span className="text-[#616161] text-xs">{callbackInfo.email}</span>}
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
                        <span className="text-xl mr-2">{getSentimentEmoji(thread.sentiment_score)}</span>
                        <span className={`text-sm font-medium ${getSentimentColor(thread.sentiment_score)}`}>
                          {thread.sentiment_score !== undefined && thread.sentiment_score !== null
                            ? thread.sentiment_score
                            : "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-sm text-[#212121]">
                      <Link href={`/thread/${thread.id}`} className="hover:text-[#038a71] cursor-pointer">
                        {thread.message_preview || "No preview available"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 text-[#616161] mr-1" />
                        {thread.count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-[#616161] mr-1" />
                        {formatDuration(thread.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      <div className="flex items-center">
                        <Timer className="h-4 w-4 text-[#616161] mr-1" />
                        {formatMeanResponseTime(thread.mean_response_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                            thread.starred ? "fill-yellow-400 text-yellow-400" : "text-[#616161] hover:text-[#212121]"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-[#616161] mb-4" />
                    <p className="text-[#616161] mb-2">No chats found.</p>
                    <p className="text-sm text-[#616161]">
                      Try adjusting your filters or time period to see more results.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
