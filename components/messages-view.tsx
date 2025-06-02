"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

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
    } else {
      setCursor(null)
    }
  }, [initialThreads])

  // Load more threads function
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
        limit: "10",
      })

      if (selectedBot) {
        params.append("bot", selectedBot)
      }

      const response = await fetch(`/api/messages?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newThreads = await response.json()

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
      console.error("❌ Error loading more threads:", error)
      setHasMore(false) // Stop trying to load more on error
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, cursor, selectedBot])

  // Scroll event handler for infinite scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer

      // Check if user has scrolled past halfway up
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight)

      if (scrollPercentage < 0.5 && hasMore && !loading) {
        console.log("🔄 Triggering infinite scroll at", Math.round(scrollPercentage * 100) + "%")
        loadMoreThreads()
      }
    }

    scrollContainer.addEventListener("scroll", handleScroll)
    return () => scrollContainer.removeEventListener("scroll", handleScroll)
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

  return (
    <div className="h-full flex flex-col bg-[#f9fafc]">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-[#e0e0e0] bg-white">
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
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete("date")
                  router.push(`/messages?${params.toString()}`)
                }}
                className="text-[#038a71] hover:underline"
              >
                Clear filter
              </button>
            </p>
          ) : (
            <p className="text-[#616161]">View and search all messages for the selected bot.</p>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
          />
        </div>
      </div>

      {/* Messages Container with Infinite Scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-[15%] py-4 space-y-4">
        {/* Loading indicator at top */}
        {loading && (
          <div className="text-center py-4">
            <div className="text-[#616161]">Loading more messages...</div>
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-center py-2 text-xs text-gray-500">
            Showing {filteredThreads.length} threads | Cursor: {cursor ? new Date(cursor).toLocaleDateString() : "None"}{" "}
            | Has More: {hasMore ? "Yes" : "No"}
          </div>
        )}

        {filteredThreads.map((thread) => (
          <div key={thread.id} className="space-y-4">
            {/* Thread Header */}
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
                <div className="inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm max-w-md">
                  {thread.message_preview}
                </div>
              </div>
            )}

            {/* Callback Information */}
            {thread.callback && (thread.user_name || thread.user_email) && (
              <div className="text-center py-2">
                <div className="inline-block bg-orange-50 text-orange-800 px-4 py-2 rounded-lg text-sm">
                  <div className="font-medium">{thread.user_name}</div>
                  <div className="text-xs">{thread.user_email}</div>
                </div>
              </div>
            )}

            {/* Messages */}
            {thread.messages?.map((message: any) => {
              const isUser = ["user", "suggested_button", "menu_button"].includes(message.role)
              const isPresetMessage = ["suggested_button", "menu_button"].includes(message.role)
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
                    {isUser && (
                      <div className="text-xs text-[#616161] mb-1 px-2">
                        {isPresetMessage ? "Preset message" : "USER"}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative w-full rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? isPresetMessage
                            ? "bg-[#effdf5] border border-[#e0e0e0] rounded-bl-md"
                            : "bg-[#effdf5] border border-[#e0e0e0] rounded-bl-md"
                          : "bg-[#424242] text-white rounded-br-md"
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
