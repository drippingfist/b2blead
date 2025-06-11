"use client"

import { useState, useCallback } from "react"
import ThreadsView from "@/components/threads-view"
import type { Thread } from "@/lib/simple-database"
import { ChevronDown, Check, Calendar } from "lucide-react"
import { useRef, useEffect } from "react"

const TIME_PERIOD_OPTIONS = [
  { value: "none", label: "None" },
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "last90days", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

export default function ChatsPageClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("none")
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const loadThreadsForPeriod = useCallback(async (timePeriod: string) => {
    if (timePeriod === "none") {
      setThreads([])
      setTotalCount(0)
      setHasMore(false)
      return
    }

    setLoading(true)

    try {
      console.log("🔄 Loading threads for period:", timePeriod)

      const response = await fetch(`/api/threads?limit=20&offset=0&timePeriod=${timePeriod}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log("✅ Loaded", data.threads.length, "threads for period:", timePeriod)

      setThreads(data.threads || [])
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore && (data.threads?.length || 0) === 20)
    } catch (error) {
      console.error("❌ Error loading threads:", error)
      setThreads([])
      setTotalCount(0)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMoreThreads = useCallback(async () => {
    if (loading || !hasMore || selectedTimePeriod === "none") return

    setLoading(true)
    try {
      console.log("🔄 Loading more threads, current count:", threads.length)

      const response = await fetch(`/api/threads?limit=20&offset=${threads.length}&timePeriod=${selectedTimePeriod}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log("✅ Loaded", data.threads.length, "more threads")

      if (data.threads && data.threads.length > 0) {
        setThreads((prev) => [...prev, ...data.threads])
        setHasMore(data.hasMore && data.threads.length === 20)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("❌ Error loading more threads:", error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [threads.length, loading, hasMore, selectedTimePeriod])

  const handleRefresh = useCallback(async () => {
    if (selectedTimePeriod !== "none") {
      await loadThreadsForPeriod(selectedTimePeriod)
    }
  }, [selectedTimePeriod, loadThreadsForPeriod])

  const handleTimePeriodChange = (timePeriod: string) => {
    setSelectedTimePeriod(timePeriod)
    setDropdownOpen(false)
    loadThreadsForPeriod(timePeriod)
  }

  const getCurrentTimePeriodLabel = () => {
    return TIME_PERIOD_OPTIONS.find((option) => option.value === selectedTimePeriod)?.label || "None"
  }

  return (
    <div>
      {/* Time Period Selector */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-gray-500 mr-3" />
          <span className="text-sm text-gray-600 mr-3">Time Period:</span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center border border-[#e0e0e0] rounded-md px-4 py-2 bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
            >
              <span className={`text-sm ${selectedTimePeriod === "none" ? "text-gray-500" : "text-[#212121]"}`}>
                {getCurrentTimePeriodLabel()}
              </span>
              <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#e0e0e0] rounded-md shadow-lg">
                {TIME_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimePeriodChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      selectedTimePeriod === option.value ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {selectedTimePeriod === option.value && <Check className="h-4 w-4 text-[#038a71]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTimePeriod !== "none" && <div className="text-sm text-gray-600">{totalCount} total conversations</div>}
      </div>

      {/* Loading State */}
      {loading && selectedTimePeriod !== "none" && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#038a71]"></div>
          <span className="ml-2 text-[#616161]">Loading conversations...</span>
        </div>
      )}

      {/* Threads Table */}
      <ThreadsView
        initialThreads={threads}
        onRefresh={handleRefresh}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        totalCount={totalCount}
        selectedTimePeriod={selectedTimePeriod}
        showEmptyState={selectedTimePeriod === "none"}
      />
    </div>
  )
}
