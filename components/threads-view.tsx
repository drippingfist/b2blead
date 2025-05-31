"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Star,
  MoreVertical,
  Phone,
  Clock,
  MessageSquare,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { Thread, Bot } from "@/lib/database"
import Link from "next/link"
import { formatTimeInTimezone, formatDateOnlyInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"
import { refreshSentimentAnalysis } from "@/lib/actions"

interface ThreadsViewProps {
  initialThreads: Thread[]
  selectedBot?: string | null
  onRefresh?: () => void
  bots?: Bot[] // Add bots prop to get timezone info
}

interface ThreadWithMessageCount extends Thread {
  // count column already exists in Thread interface
}

export default function ThreadsView({ initialThreads, selectedBot, onRefresh, bots = [] }: ThreadsViewProps) {
  const [threads, setThreads] = useState<ThreadWithMessageCount[]>([])
  const [threadIdEnabled, setThreadIdEnabled] = useState(false) // Hidden by default
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hoveredSentiment, setHoveredSentiment] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [refreshingSentiment, setRefreshingSentiment] = useState<string | null>(null)

  // Process threads when initialThreads changes
  useEffect(() => {
    // Sort threads by created_at in descending order (newest first)
    const sortedThreads = [...initialThreads].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    setThreads(sortedThreads)
  }, [initialThreads, bots, selectedBot])

  // Get timezone for the selected bot
  const getSelectedBotTimezone = (): string | undefined => {
    if (!selectedBot || !bots.length) return undefined
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone
  }

  const displayTimezone = getSelectedBotTimezone()
  const timezoneAbbr = getTimezoneAbbreviation(displayTimezone)

  // Group threads by date (using timezone-adjusted dates)
  const groupedThreads = threads.reduce((groups: { [key: string]: ThreadWithMessageCount[] }, thread) => {
    const date = formatDateOnlyInTimezone(thread.created_at, displayTimezone)

    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(thread)
    return groups
  }, {})

  // Filter threads based on search query
  const filteredThreads = searchQuery
    ? threads.filter(
        (thread) =>
          thread.message_preview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          thread.thread_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          thread.sentiment_justification?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : threads

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

      // Update local state to show null immediately
      setThreads((prevThreads) =>
        prevThreads.map((thread) =>
          thread.id === threadId ? { ...thread, sentiment_score: null, sentiment_justification: null } : thread,
        ),
      )

      // Call the server action
      const result = await refreshSentimentAnalysis(threadId)

      // Refresh the thread data after a delay
      setTimeout(() => {
        if (onRefresh) {
          onRefresh()
        }
      }, 3000)
    } catch (error: any) {
      // Silent error handling
    } finally {
      setRefreshingSentiment(null)
    }
  }

  // Get the selected bot's client name for display
  const getSelectedBotName = () => {
    if (!selectedBot || !bots.length) return null
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.client_name || bot?.bot_share_name || selectedBot
  }

  const selectedBotName = getSelectedBotName()

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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="mb-6">
          <p className="text-[#616161]">
            {selectedBot ? `Showing threads for ${selectedBotName}` : "Showing all threads"} ({threads.length} total)
            {displayTimezone && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full md:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
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

          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <span className="text-sm text-[#616161]">Last 30 days</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

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
          <span className="ml-2 text-[#616161]">Loading...</span>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  START TIME
                  <ChevronDown className="h-4 w-4 ml-1" />
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
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Duration
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
                    <td colSpan={6} className="px-6 py-2 text-sm font-medium text-[#616161]">
                      {date}
                    </td>
                  </tr>
                  {dateThreads.map((thread, index) => (
                    <tr key={thread.id} className="bg-white hover:bg-[#f5f5f5] border-t border-[#e0e0e0]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                        {formatTimeInTimezone(thread.created_at, displayTimezone)}
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
                        {thread.message_preview || "No preview available"}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {thread.cb_requested && (
                            <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />
                          )}
                          <Link href={`/thread/${thread.id}`}>
                            <MessageSquare className="h-4 w-4 text-[#616161] hover:text-[#212121]" />
                          </Link>
                          <button className="text-[#616161] hover:text-[#212121]">
                            <Star className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-[#616161] mb-4" />
                    <p className="text-[#616161] mb-2">No chats found.</p>
                    <p className="text-sm text-[#616161]">
                      {selectedBot
                        ? `No chat threads found for ${selectedBotName}.`
                        : `No chat threads found for any of your accessible bots.`}
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
                {dateThreads.map((thread) => (
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
                        {thread.cb_requested && <Phone className="h-4 w-4 text-[#038a71]" title="Callback requested" />}
                        <button className="text-[#616161] hover:text-[#212121]">
                          <Star className="h-4 w-4" />
                        </button>
                        <button className="text-[#616161] hover:text-[#212121]">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-[#212121] mb-2">
                      {thread.message_preview || "No preview available"}
                    </div>

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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-[#e0e0e0] rounded-md p-8 text-center">
            <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
            <p className="text-[#616161]">No threads found. Create your first conversation to get started.</p>
          </div>
        )}
      </div>

      {filteredThreads.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-[#616161]">No conversations found matching your search.</p>
        </div>
      )}
    </div>
  )
}
