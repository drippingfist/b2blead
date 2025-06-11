"use client"

import { useState, useCallback } from "react"
import ThreadsView from "@/components/threads-view"
import type { Thread } from "@/lib/simple-database"
import { Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const TIME_PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "last90days", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

export default function ChatsPageClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const loadThreadsForPeriod = useCallback(async (timePeriod: string) => {
    setLoading(true)
    setSelectedTimePeriod(timePeriod)

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
      setHasLoadedOnce(true)
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
    if (loading || !hasMore || !selectedTimePeriod) return

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
    if (selectedTimePeriod) {
      await loadThreadsForPeriod(selectedTimePeriod)
    }
  }, [selectedTimePeriod, loadThreadsForPeriod])

  // Show time period selection if no period is selected
  if (!hasLoadedOnce) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select Time Period</h2>
            <p className="text-gray-600">
              Choose a time period to view your chat conversations. This helps keep the page fast and organized.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TIME_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onClick={() => loadThreadsForPeriod(option.value)}
                disabled={loading}
                variant="outline"
                className="flex items-center justify-center p-4 h-auto hover:bg-[#038a71] hover:text-white hover:border-[#038a71] transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>

          {loading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#038a71]"></div>
              <span className="ml-2 text-gray-600">Loading conversations...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show threads view once a period is selected
  return (
    <div>
      {/* Time Period Selector Bar */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm text-gray-600">Current period:</span>
            <span className="ml-2 font-medium text-gray-900">
              {TIME_PERIOD_OPTIONS.find((p) => p.value === selectedTimePeriod)?.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TIME_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onClick={() => loadThreadsForPeriod(option.value)}
                disabled={loading}
                variant={selectedTimePeriod === option.value ? "default" : "outline"}
                size="sm"
                className={selectedTimePeriod === option.value ? "bg-[#038a71] hover:bg-[#038a71]/90" : ""}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ThreadsView
        initialThreads={threads}
        onRefresh={handleRefresh}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        totalCount={totalCount}
        selectedTimePeriod={selectedTimePeriod}
      />
    </div>
  )
}
