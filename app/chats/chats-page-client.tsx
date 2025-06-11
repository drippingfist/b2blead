"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar, ChevronDown, Check, RefreshCw, MessageSquare, Clock, User, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import type { Bot } from "@/lib/database"

interface Thread {
  id: string
  thread_id?: string
  created_at: string
  updated_at: string
  message_preview?: string
  count?: number
  bot_share_name?: string
  duration?: string
  sentiment_score?: number
}

interface ChatsPageClientProps {
  bots: Bot[]
}

type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"

const TIME_PERIOD_OPTIONS = [
  { value: "today" as TimePeriod, label: "Today" },
  { value: "last7days" as TimePeriod, label: "Last 7 days" },
  { value: "last30days" as TimePeriod, label: "Last 30 days" },
  { value: "last90days" as TimePeriod, label: "Last 90 days" },
  { value: "alltime" as TimePeriod, label: "All Time" },
]

export default function ChatsPageClient({ bots }: ChatsPageClientProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last30days")
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [botDropdownOpen, setBotDropdownOpen] = useState(false)
  const [currentThreadCount, setCurrentThreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)
  const botDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setTimePeriodDropdownOpen(false)
      }
      if (botDropdownRef.current && !botDropdownRef.current.contains(event.target as Node)) {
        setBotDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  // Function to reload threads based on time period and bot selection
  const reloadThreadsForTimePeriod = async (period: TimePeriod, botFilter?: string | null) => {
    setLoading(true)
    console.log("🔄 Reloading threads for period:", period, "and bot:", botFilter || "ALL")

    try {
      // Build the query
      let query = supabase
        .from("threads")
        .select("*")
        .gt("count", 0)
        .order("updated_at", { ascending: false })
        .limit(50)

      // Apply bot filter if selected
      if (botFilter) {
        query = query.eq("bot_share_name", botFilter)
      }

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(period)
      if (dateFilter) {
        query = query.gte("created_at", dateFilter)
      }

      console.log("📊 Executing query with filters:", {
        bot: botFilter || "ALL",
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

  // Handle time period change
  const handleTimePeriodChange = async (period: TimePeriod) => {
    setCurrentTimePeriod(period)
    setTimePeriodDropdownOpen(false)
    await reloadThreadsForTimePeriod(period, selectedBot)
  }

  // Handle bot change
  const handleBotChange = async (botShareName: string | null) => {
    setSelectedBot(botShareName)
    setBotDropdownOpen(false)
    await reloadThreadsForTimePeriod(currentTimePeriod, botShareName)
  }

  // Initialize with current time period on mount
  useEffect(() => {
    reloadThreadsForTimePeriod(currentTimePeriod, selectedBot)
  }, [])

  // Get current time period label
  const getCurrentTimePeriodLabel = () => {
    return TIME_PERIOD_OPTIONS.find((option) => option.value === currentTimePeriod)?.label || "Last 30 days"
  }

  // Get selected bot name for display
  const getSelectedBotName = () => {
    if (!selectedBot) return "All Bots"
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.client_name || bot?.bot_share_name || selectedBot
  }

  // Filter threads based on search query
  const filteredThreads = searchQuery
    ? threads.filter(
        (thread) =>
          thread.message_preview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          thread.thread_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          thread.bot_share_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : threads

  // Format duration
  const formatDuration = (duration?: string) => {
    if (!duration) return "00:00:00"
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (match) {
      const [, hours, minutes, seconds] = match
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
    }
    return duration
  }

  // Get sentiment emoji
  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 4) return "😊"
    if (sentiment === 3) return "😐"
    return "😞"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Debug Information Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">🔍 Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="font-medium text-blue-700">Selected Bot:</span>
            <span className="ml-2 text-blue-600">{getSelectedBotName()}</span>
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
          <p className="text-gray-600 mt-1">
            {currentThreadCount} conversations found for {getSelectedBotName()} in {getCurrentTimePeriodLabel()}
          </p>
        </div>

        <div className="flex space-x-2">
          {/* Bot Selector */}
          <div className="relative" ref={botDropdownRef}>
            <button
              onClick={() => setBotDropdownOpen(!botDropdownOpen)}
              className="flex items-center border border-gray-300 rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <User className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">{getSelectedBotName()}</span>
              <ChevronDown className="h-4 w-4 text-gray-500 ml-2" />
            </button>

            {botDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px]">
                <button
                  onClick={() => handleBotChange(null)}
                  disabled={loading}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                    !selectedBot ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <span>All Bots</span>
                  {!selectedBot && <Check className="h-4 w-4 text-blue-700" />}
                </button>
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => handleBotChange(bot.bot_share_name || "")}
                    disabled={loading}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                      selectedBot === bot.bot_share_name ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                  >
                    <span>{bot.client_name || bot.bot_share_name}</span>
                    {selectedBot === bot.bot_share_name && <Check className="h-4 w-4 text-blue-700" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Period Selector */}
          <div className="relative" ref={timePeriodDropdownRef}>
            <button
              onClick={() => setTimePeriodDropdownOpen(!timePeriodDropdownOpen)}
              className="flex items-center border border-gray-300 rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">{getCurrentTimePeriodLabel()}</span>
              <ChevronDown className="h-4 w-4 text-gray-500 ml-2" />
            </button>

            {timePeriodDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 bg-white border border-gray-300 rounded-md shadow-lg min-w-[150px]">
                {TIME_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimePeriodChange(option.value)}
                    disabled={loading}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                      currentTimePeriod === option.value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                  >
                    <span>{option.label}</span>
                    {currentTimePeriod === option.value && <Check className="h-4 w-4 text-blue-700" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => reloadThreadsForTimePeriod(currentTimePeriod, selectedBot)}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>

          <Button className="bg-blue-600 hover:bg-blue-700">Export</Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading conversations...</span>
        </div>
      )}

      {/* Threads List */}
      {!loading && (
        <div className="space-y-4">
          {filteredThreads && filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <Link key={thread.id} href={`/chats/${thread.id}`}>
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">Thread {thread.thread_id || thread.id.slice(0, 8)}</h3>
                      {thread.sentiment_score && (
                        <span className="text-lg">{getSentimentEmoji(thread.sentiment_score)}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">{new Date(thread.updated_at).toLocaleDateString()}</span>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(thread.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {thread.message_preview || "No preview available"}
                  </p>

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {thread.count || 0} messages
                      </span>
                      {thread.duration && (
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(thread.duration)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-700">
                        {bots.find((b) => b.bot_share_name === thread.bot_share_name)?.client_name ||
                          thread.bot_share_name}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "No conversations match your search criteria."
                  : `No conversations found for ${getSelectedBotName()} in ${getCurrentTimePeriodLabel()}.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!loading && filteredThreads.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredThreads.length} of {currentThreadCount} conversations
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  )
}
