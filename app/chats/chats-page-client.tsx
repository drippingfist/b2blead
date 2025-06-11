"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar, ChevronDown, Check, RefreshCw, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import type { Bot } from "@/lib/database"

interface ChatsPageClientProps {
  bots: Bot[]
}

type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime"
type DisplayLimit = 50 | 100 | 500

const TIME_PERIOD_OPTIONS = [
  { value: "today" as TimePeriod, label: "Today" },
  { value: "last7days" as TimePeriod, label: "Last 7 days" },
  { value: "last30days" as TimePeriod, label: "Last 30 days" },
  { value: "last90days" as TimePeriod, label: "Last 90 days" },
  { value: "alltime" as TimePeriod, label: "All Time" },
]

const DISPLAY_LIMIT_OPTIONS = [
  { value: 50 as DisplayLimit, label: "50 rows" },
  { value: 100 as DisplayLimit, label: "100 rows" },
  { value: 500 as DisplayLimit, label: "500 rows" },
]

export default function ChatsPageClient({ bots }: ChatsPageClientProps) {
  const [loading, setLoading] = useState(false)
  const [selectedBot, setSelectedBot] = useState<string>("amata")
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last7days")
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(50)
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false)
  const [totalThreadCount, setTotalThreadCount] = useState(0)

  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)
  const limitDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setTimePeriodDropdownOpen(false)
      }
      if (limitDropdownRef.current && !limitDropdownRef.current.contains(event.target as Node)) {
        setLimitDropdownOpen(false)
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

  // Function to get thread count based on time period and bot selection
  const getThreadCount = async (period: TimePeriod, botFilter: string, limit: DisplayLimit = displayLimit) => {
    setLoading(true)
    console.log("🔄 Getting thread count for period:", period, "bot:", botFilter, "limit:", limit)

    try {
      // Build the base query for count
      let baseQuery = supabase.from("threads").select("*", { count: "exact" }).gt("count", 0)

      // Apply bot filter
      baseQuery = baseQuery.eq("bot_share_name", botFilter)

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(period)
      if (dateFilter) {
        baseQuery = baseQuery.gte("created_at", dateFilter)
      }

      // Get the total count
      const { count: totalCount, error: countError } = await baseQuery

      if (countError) {
        console.error("❌ Error fetching total count:", countError)
        setTotalThreadCount(0)
      } else {
        setTotalThreadCount(totalCount || 0)
        console.log("📊 Total thread count:", totalCount)
      }
    } catch (error) {
      console.error("❌ Unexpected error:", error)
      setTotalThreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Handle time period change
  const handleTimePeriodChange = async (period: TimePeriod) => {
    setCurrentTimePeriod(period)
    setTimePeriodDropdownOpen(false)
    await getThreadCount(period, selectedBot, displayLimit)
  }

  // Handle display limit change
  const handleDisplayLimitChange = async (limit: DisplayLimit) => {
    setDisplayLimit(limit)
    setLimitDropdownOpen(false)
    await getThreadCount(currentTimePeriod, selectedBot, limit)
  }

  // Handle refresh
  const handleRefresh = async () => {
    await getThreadCount(currentTimePeriod, selectedBot, displayLimit)
  }

  // Initialize with current settings on mount
  useEffect(() => {
    getThreadCount(currentTimePeriod, selectedBot, displayLimit)
  }, [])

  // Get current time period label
  const getCurrentTimePeriodLabel = () => {
    return TIME_PERIOD_OPTIONS.find((option) => option.value === currentTimePeriod)?.label || "Last 7 days"
  }

  // Get current display limit label
  const getCurrentDisplayLimitLabel = () => {
    return DISPLAY_LIMIT_OPTIONS.find((option) => option.value === displayLimit)?.label || "50 rows"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Debug Information Box */}
      <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          Showing threads for AMATA from {getCurrentTimePeriodLabel()} ({totalThreadCount} total) Times in GMT+7
        </h3>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 justify-center">
        {/* Time Period Selector */}
        <div className="relative" ref={timePeriodDropdownRef}>
          <button
            onClick={() => setTimePeriodDropdownOpen(!timePeriodDropdownOpen)}
            className="flex items-center border border-gray-300 rounded-md px-6 py-3 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Calendar className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-gray-700 font-medium">{getCurrentTimePeriodLabel()}</span>
            <ChevronDown className="h-5 w-5 text-gray-500 ml-3" />
          </button>

          {timePeriodDropdownOpen && (
            <div className="absolute z-50 mt-2 left-0 bg-white border border-gray-300 rounded-md shadow-lg min-w-[180px]">
              {TIME_PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimePeriodChange(option.value)}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
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

        {/* Display Limit Selector */}
        <div className="relative" ref={limitDropdownRef}>
          <button
            onClick={() => setLimitDropdownOpen(!limitDropdownOpen)}
            className="flex items-center border border-gray-300 rounded-md px-6 py-3 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <List className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-gray-700 font-medium">{getCurrentDisplayLimitLabel()}</span>
            <ChevronDown className="h-5 w-5 text-gray-500 ml-3" />
          </button>

          {limitDropdownOpen && (
            <div className="absolute z-50 mt-2 left-0 bg-white border border-gray-300 rounded-md shadow-lg min-w-[150px]">
              {DISPLAY_LIMIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDisplayLimitChange(option.value)}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 ${
                    displayLimit === option.value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <span>{option.label}</span>
                  {displayLimit === option.value && <Check className="h-4 w-4 text-blue-700" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <RefreshCw className={`h-5 w-5 mr-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Getting thread count...</span>
        </div>
      )}
    </div>
  )
}
