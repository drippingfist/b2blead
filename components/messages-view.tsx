"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Star, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

interface MessagesViewProps {
  threadsWithMessages: any[]
  bots: any[]
  selectedBot: string | null
  selectedDate?: string | null
}

export function MessagesView({
  threadsWithMessages: initialThreads,
  bots,
  selectedBot,
  selectedDate,
}: MessagesViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set())
  const [threadsWithMessages, setThreadsWithMessages] = useState(initialThreads)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [oldestVisibleDate, setOldestVisibleDate] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true) // Track if component is mounted
  const loadTriggerRef = useRef<HTMLDivElement>(null) // Ref for intersection observer
  const threadRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const router = useRouter()
  const searchParams = useSearchParams()

  // Set isMountedRef to false when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Add this useEffect right after the existing useEffect that sets isMountedRef
  useEffect(() => {
    // Read bot selection from localStorage on component mount
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null" && storedBot !== selectedBot) {
      console.log("🔄 Messages: Found different bot in localStorage:", storedBot, "vs current:", selectedBot)
      // Redirect to refresh with correct bot
      const params = new URLSearchParams(searchParams.toString())
      params.set("bot", storedBot)
      router.push(`/messages?${params.toString()}`)
    }
  }, [selectedBot, searchParams, router])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  // Update threads when props change and set cursor to the oldest thread's timestamp
  useEffect(() => {
    console.log("📥 Initial threads received:", initialThreads.length)
    if (initialThreads.length > 0) {
      console.log(
        "📊 Initial thread date range:",
        initialThreads[0]?.created_at,
        "to",
        initialThreads[initialThreads.length - 1]?.created_at,
      )
    }

    setThreadsWithMessages(initialThreads)
    setHasMore(true)

    // Set cursor to the oldest thread's created_at for pagination
    if (initialThreads.length > 0) {
      const oldestThread = initialThreads[0] // First thread should be oldest
      setCursor(oldestThread.created_at)
      console.log("🎯 Setting cursor to oldest thread:", oldestThread.created_at)

      // Set initial visible date to the most recent thread
      const mostRecentThread = initialThreads[initialThreads.length - 1]
      setOldestVisibleDate(mostRecentThread.created_at)
    } else {
      setCursor(null)
    }
  }, [initialThreads])

  // Update oldest visible date when new threads are loaded
  useEffect(() => {
    if (threadsWithMessages.length > 0) {
      const oldestThread = threadsWithMessages[0] // First thread should be oldest
      setOldestVisibleDate(oldestThread.created_at)
    }
  }, [threadsWithMessages])

  // Load more threads function - now loads 10 threads at a time
  const loadMoreThreads = useCallback(async () => {
    if (loading || !hasMore || !cursor) {
      console.log("⏸️ Skipping load more:", { loading, hasMore, cursor: !!cursor })
      return
    }

    setLoading(true)
    try {
      console.log(`🔄 Loading more threads with cursor: ${cursor}`)

      // Build the API URL
      const params = new URLSearchParams({
        cursor: cursor,
        limit: "10", // Changed to 10 threads at a time
      })

      if (selectedBot) {
        params.append("bot", selectedBot)
      }

      const controller = new AbortController()
      const signal = controller.signal

      const response = await fetch(`/api/messages?${params.toString()}`, { signal })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newThreads = await response.json()

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return

      console.log(`📦 Loaded ${newThreads.length} new threads`)
      if (newThreads.length > 0) {
        console.log(
          "📊 New threads date range:",
          newThreads[0]?.created_at,
          "to",
          newThreads[newThreads.length - 1]?.created_at,
        )
      }

      if (newThreads.length === 0) {
        console.log("🏁 No more threads available")
        setHasMore(false)
      } else {
        // Prepend new threads to the beginning (older threads)
        setThreadsWithMessages((prev) => {
          const combined = [...newThreads, ...prev]
          console.log("🔗 Combined threads count:", combined.length)
          return combined
        })

        // Update cursor to the oldest thread's timestamp from the new batch
        const newOldestThread = newThreads[0] // First thread should be oldest
        setCursor(newOldestThread.created_at)
        console.log("🎯 Updated cursor to:", newOldestThread.created_at)

        // If we got less than 10, we've reached the end
        if (newThreads.length < 10) {
          console.log("🏁 Reached end of data (partial batch)")
          setHasMore(false)
        }
      }
    } catch (error) {
      // Only log error if it's not an abort error
      if (error.name !== "AbortError") {
        console.error("❌ Error loading more threads:", error)
        if (isMountedRef.current) {
          setHasMore(false) // Stop trying to load more on error
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [loading, hasMore, cursor, selectedBot])

  // Use Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadTriggerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loading) {
          console.log("🔍 Load trigger element is visible!")
          loadMoreThreads()
        }
      },
      { threshold: 0.1 }, // Trigger when 10% of the element is visible
    )

    observer.observe(loadTriggerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [loadMoreThreads, hasMore, loading])

  const handleStarMessage = (messageId: string) => {
    setStarredMessages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
    console.log("Starred message:", messageId)
  }

  // Filter messages based on search term
  const filteredThreads = threadsWithMessages.filter((thread) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    const messagePreviewMatch = thread.message_preview?.toLowerCase().includes(searchLower)
    const messagesMatch = thread.messages?.some((message: any) => message.content?.toLowerCase().includes(searchLower))

    return messagePreviewMatch || messagesMatch
  })

  // Format the date range indicator
  const formatDateRange = (oldestDateString: string | null) => {
    if (!oldestDateString) return ""

    const oldestDate = new Date(oldestDateString)
    const today = new Date()

    // Format the oldest date
    const formatDate = (date: Date) => {
      const day = date.getDate()
      const month = date.toLocaleDateString("en-US", { month: "long" })

      // Add ordinal suffix to day
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return "th"
        switch (day % 10) {
          case 1:
            return "st"
          case 2:
            return "nd"
          case 3:
            return "rd"
          default:
            return "th"
        }
      }

      return `${day}${getOrdinalSuffix(day)} ${month}`
    }

    const formattedOldestDate = formatDate(oldestDate)

    return `${formattedOldestDate} - Today`
  }

  // Clear date filter
  const clearDateFilter = () => {
    localStorage.removeItem("selectedDate")
    router.push(`/messages`)
  }

  return (
    <div className="h-full flex flex-col bg-[#f9fafc]">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 p-4 md:p-6 border-b border-[#e0e0e0] bg-white shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#212121]">Messages</h1>
          {selectedDate ? (
            <p className="text-[#616161]">
              Viewing messages from{" "}
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              <button onClick={clearDateFilter} className="text-[#038a71] hover:underline">
                Clear filter
              </button>
            </p>
          ) : (
            <p className="text-[#616161]">
              {selectedBot
                ? `Viewing messages for ${bots.find((b) => b.bot_share_name === selectedBot)?.client_name || selectedBot}`
                : "View and search all messages for the selected bot."}
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex justify-center">
          <div className="relative w-1/2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
            />
          </div>
        </div>

        {/* Date Range Indicator */}
        {oldestVisibleDate && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center bg-[#f5f5f5] text-[#616161] px-3 py-1 rounded-full text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{formatDateRange(oldestVisibleDate)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Container with Infinite Scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-[15%] py-4 space-y-4">
        {/* Intersection Observer Trigger Element */}
        <div ref={loadTriggerRef} className="h-10 -mt-2 flex items-center justify-center">
          {hasMore && !loading && <div className="text-xs text-gray-400">Scroll to load more</div>}
        </div>

        {/* Loading indicator at top */}
        {loading && (
          <div className="text-center py-4">
            <div className="text-[#616161]">Loading more threads...</div>
          </div>
        )}

        {filteredThreads.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-[#616161]">No messages found for {selectedBot || "the selected bot"}.</div>
          </div>
        )}

        {filteredThreads.map((thread, index) => (
          <div
            key={thread.id}
            className="space-y-4"
            ref={(el) => {
              if (el) {
                threadRefs.current.set(thread.id, el)
                el.setAttribute("data-thread-id", thread.id)
                el.setAttribute("data-thread-date", thread.created_at)
              }
            }}
          >
            {/* Thread Header with index for debugging */}
            <div className="text-center py-2">
              <div className="inline-block bg-[#f5f5f5] text-[#616161] px-3 py-1 rounded-full text-xs">
                {new Date(thread.created_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Message Preview */}
            {thread.message_preview && (
              <div className="text-center py-2">
                <Link
                  href={`/thread/${thread.id}`}
                  className="inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm max-w-md hover:bg-blue-100 hover:text-blue-900 transition-colors cursor-pointer"
                >
                  {thread.message_preview}
                </Link>
              </div>
            )}

            {/* Callback Information */}
            {thread.callback === true && (
              <div className="text-center py-2">
                <div className="inline-block bg-orange-50 text-orange-800 px-4 py-2 rounded-lg text-sm">
                  <div className="font-medium">{thread.callbackData?.user_name || "Callback Requested"}</div>
                  {thread.callbackData?.user_email && <div className="text-xs">{thread.callbackData.user_email}</div>}
                </div>
              </div>
            )}

            {/* Messages */}
            {thread.messages?.map((message: any) => {
              const isUser = ["user", "suggested_button", "menu_button"].includes(message.role)
              const isStarred = starredMessages.has(message.id)

              return (
                <div key={message.id} className={`flex ${isUser ? "justify-start" : "justify-end"} mb-8 group`}>
                  {/* Star button for user messages (left side) */}
                  {isUser && (
                    <button
                      onClick={() => handleStarMessage(message.id)}
                      className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] mr-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Star className={`h-4 w-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-[#616161]"}`} />
                    </button>
                  )}

                  <div className={`flex flex-col ${isUser ? "items-start" : "items-end"} max-w-[60%] min-w-[120px]`}>
                    {/* Message Label */}
                    {isUser && <div className="text-xs text-[#616161] mb-1 px-2">{message.role}</div>}

                    {/* Message Bubble */}
                    <div
                      className={`relative w-full rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? message.role === "user"
                            ? "bg-white border border-[#e0e0e0] rounded-bl-md"
                            : "bg-[#effdf5] border border-[#e0e0e0] rounded-bl-md"
                          : "bg-[#048a71] text-white rounded-br-md"
                      }`}
                    >
                      <p className={`text-sm leading-relaxed break-words ${isUser ? "text-[#212121]" : "text-white"}`}>
                        {message.content}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs mt-1 px-2 text-[#616161]">
                      {message.formattedTime || new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Star button for bot messages (right side) */}
                  {!isUser && (
                    <button
                      onClick={() => handleStarMessage(message.id)}
                      className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Star className={`h-4 w-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-[#616161]"}`} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
