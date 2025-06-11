"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  Star,
  Phone,
  Clock,
  MessageSquare,
  RefreshCw,
  Timer,
  User,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  bots?: Bot[]
  totalCount?: number
  selectedTimePeriod?: string
  onLoadMore?: () => Promise<void>
  hasMore: boolean
  showEmptyState?: boolean
}

interface ThreadWithMessageCount extends Thread {
  callbacks?: {
    user_name?: string
    user_first_name?: string
    user_surname?: string
    user_email?: string
  } | null
}

export default function ThreadsView({
  initialThreads = [],
  selectedBot,
  onRefresh,
  bots = [],
  totalCount = 0,
  selectedTimePeriod = "none",
  onLoadMore,
  hasMore,
  showEmptyState = false,
}: ThreadsViewProps) {
  const [threads, setThreads] = useState<ThreadWithMessageCount[]>([])
  const [threadIdEnabled, setThreadIdEnabled] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [refreshingSentiment, setRefreshingSentiment] = useState<string | null>(null)
  const [starringSentiment, setStarringSentiment] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  // Process threads when initialThreads changes
  useEffect(() => {
    if (!initialThreads) {
      setThreads([])
      return
    }

    const sortedThreads = [...initialThreads].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    setThreads(sortedThreads)
  }, [initialThreads])

  const displayTimezone = "Asia/Bangkok"
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
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

  const sortedThreads = sortThreads(threads || [])

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
    if (sentiment >= 4) return "😊"
    if (sentiment === 3) return "😐"
    return "😞"
  }

  const getSentimentColor = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "text-gray-500"
    if (sentiment >= 4) return "text-green-600"
    if (sentiment === 3) return "text-yellow-600"
    return "text-red-600"
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

  const formatMeanResponseTime = (meanResponseTime?: number) => {
    if (meanResponseTime === undefined || meanResponseTime === null) return "N/A"
    const seconds = meanResponseTime / 1000
    return `${seconds.toFixed(2)}s`
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
    }
  }

  const handleSentimentRefresh = async (threadId: string) => {
    try {
      setRefreshingSentiment(threadId)

      setThreads((prevThreads) =>
        prevThreads.map((thread) =>
          thread.id === threadId ? { ...thread, sentiment_score: null, sentiment_justification: null } : thread,
        ),
      )

      const result = await refreshSentimentAnalysis(threadId)

      setTimeout(async () => {
        try {
          const { data: updatedThread, error } = await supabase
            .from("threads")
            .select("sentiment_score, sentiment_justification")
            .eq("id", threadId)
            .single()

          if (!error && updatedThread) {
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
      setTimeout(() => {
        setRefreshingSentiment(null)
      }, 2000)
    }
  }

  const handleStarToggle = async (threadId: string) => {
    try {
      setStarringSentiment(threadId)

      setThreads((prevThreads) =>
        prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
      )

      const result = await toggleThreadStarred(threadId)

      if (!result.success) {
        setThreads((prevThreads) =>
          prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
        )
        console.error("Failed to toggle star:", result.error)
      }
    } catch (error: any) {
      setThreads((prevThreads) =>
        prevThreads.map((thread) => (thread.id === threadId ? { ...thread, starred: !thread.starred } : thread)),
      )
      console.error("Error toggling star:", error)
    } finally {
      setStarringSentiment(null)
    }
  }

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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !onLoadMore) return
    setIsLoadingMore(true)
    try {
      await onLoadMore()
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, onLoadMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          console.log("🔄 Intersection detected, loading more...")
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current)
      }
    }
  }, [hasMore, isLoadingMore, loadMore])

  return (
    <div className="relative">
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

      {/* Search and Filters - only show if not empty state */}
      {!showEmptyState && (
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

          <div className="flex space-x-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full md:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button className="bg-[#038a71] hover:bg-[#038a71]/90 w-full md:w-auto">Export</Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <button
                  onClick={() => handleSort("time")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                  disabled={showEmptyState}
                >
                  START TIME
                  {!showEmptyState && renderSortIcon("time")}
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
                  disabled={showEmptyState}
                >
                  Messages
                  {!showEmptyState && renderSortIcon("messages")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <button
                  onClick={() => handleSort("duration")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                  disabled={showEmptyState}
                >
                  Duration
                  {!showEmptyState && renderSortIcon("duration")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <button
                  onClick={() => handleSort("response_time")}
                  className="flex items-center hover:text-[#038a71] transition-colors"
                  disabled={showEmptyState}
                >
                  Avg. Response Time
                  <Info className="h-4 w-4 ml-1 text-[#616161]" />
                  {!showEmptyState && renderSortIcon("response_time")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {showEmptyState ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Calendar className="h-12 w-12 text-[#616161] mb-4" />
                    <p className="text-[#616161] mb-2">Select a time period to view conversations</p>
                    <p className="text-sm text-[#616161]">
                      Choose a time period from the dropdown above to load chat threads.
                    </p>
                  </div>
                </td>
              </tr>
            ) : Object.entries(groupedThreads).length > 0 ? (
              Object.entries(groupedThreads).map(([date, dateThreads]) => (
                <>
                  <tr key={`date-${date}`} className="bg-gray-50">
                    <td colSpan={8} className="px-6 py-2 text-sm font-medium text-[#616161]">
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
                    <p className="text-[#616161] mb-2">No conversations found</p>
                    <p className="text-sm text-[#616161]">No chat threads found for the selected time period.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && !showEmptyState && (
        <div ref={observerRef} className="h-20 w-full flex items-center justify-center">
          <div className="text-sm text-gray-400">Scroll to load more...</div>
        </div>
      )}

      {filteredThreads.length === 0 && searchQuery && !showEmptyState && (
        <div className="text-center py-12">
          <p className="text-[#616161]">No conversations found matching your search.</p>
        </div>
      )}

      {isLoadingMore && !showEmptyState && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#038a71]"></div>
          <span className="ml-2 text-[#616161]">Loading more threads...</span>
        </div>
      )}

      {!hasMore && threads.length > 0 && !showEmptyState && (
        <div className="text-center py-4">
          <p className="text-[#616161] text-sm">You've reached the end of the threads list.</p>
        </div>
      )}
    </div>
  )
}
