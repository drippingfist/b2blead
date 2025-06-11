"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
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
type DisplayLimit = 50 | 100 | 500

const TIME_PERIOD_OPTIONS = [
  { value: "today" as TimePeriod, label: "Today" },
  { value: "last7days" as TimePeriod, label: "Last 7 days" },
  { value: "last30days" as TimePeriod, label: "Last 30 days" },
  { value: "last90days" as TimePeriod, label: "Last 90 days" },
  { value: "alltime" as TimePeriod, label: "All Time" },
]

const DISPLAY_LIMIT_OPTIONS = [
  { value: 50 as DisplayLimit, label: "50 threads" },
  { value: 100 as DisplayLimit, label: "100 threads" },
  { value: 500 as DisplayLimit, label: "500 threads" },
]

export default function ChatsPageClient({ bots }: ChatsPageClientProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [currentTimePeriod, setCurrentTimePeriod] = useState<TimePeriod>("last30days")
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(50)
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false)
  const [botDropdownOpen, setBotDropdownOpen] = useState(false)
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false)
  const [currentThreadCount, setCurrentThreadCount] = useState(0)
  const [totalThreadCount, setTotalThreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)
  const botDropdownRef = useRef<HTMLDivElement>(null)
  const limitDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setTimePeriodDropdownOpen(false)
      }
      if (botDropdownRef.current && !botDropdownRef.current.contains(event.target as Node)) {
        setBotDropdownOpen(false)
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

  // Function to reload threads based on time period and bot selection
  const reloadThreadsForTimePeriod = async (
    period: TimePeriod,
    botFilter?: string | null,
    limit: DisplayLimit = displayLimit,
  ) => {
    setLoading(true)
    console.log("🔄 Reloading threads for period:", period, "bot:", botFilter || "ALL", "limit:", limit)

    try {
      // Build the base query for both count and data
      let baseQuery = supabase.from("threads").select("*", { count: "exact" }).gt("count", 0)

      // Apply bot filter if selected
      if (botFilter) {
        baseQuery = baseQuery.eq("bot_share_name", botFilter)
      }

      // Apply time period filter
      const dateFilter = getDateFilterForPeriod(period)
      if (dateFilter) {
        baseQuery = baseQuery.gte("created_at", dateFilter)
      }

      // First, get the total count without limit
      const { count: totalCount, error: countError } = await baseQuery

      if (countError) {
        console.error("❌ Error fetching total count:", countError)
        setTotalThreadCount(0)
      } else {
        setTotalThreadCount(totalCount || 0)
      }

      // Then, get the threads with the specified limit
      const { data: threadData, error: dataError } = await baseQuery.limit(limit)

      if (dataError) {
        console.error("❌ Error fetching threads:", dataError)
        setThreads([])
      } else {
        setThreads(threadData || [])
      }
    } catch (error) {
      console.error("❌ Unexpected error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load of threads
  useEffect(() => {
    reloadThreadsForTimePeriod(currentTimePeriod, selectedBot)
  }, [currentTimePeriod, selectedBot])

  return (
    <div className="flex flex-col space-y-4">
      {/* Dropdowns and buttons for filtering */}
      {/* Thread list */}
    </div>
  )
}
