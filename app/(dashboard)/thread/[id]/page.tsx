"use client"

import { getMessagesByThreadId } from "@/lib/database"
import { supabase } from "@/lib/supabase/client"
import { notFound, useRouter } from "next/navigation"
import { ArrowLeft, Clock, MessageSquare, Phone, Timer, Star } from "lucide-react"
import { useState, useEffect } from "react"

export default function ThreadDetailPage({ params }: { params: { id: string } }) {
  const threadId = params.id
  const [messages, setMessages] = useState<any[]>([])
  const [thread, setThread] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const router = useRouter()

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      const newBotSelection = event.detail
      console.log("🔄 Thread Detail: Bot selection changed to:", newBotSelection)

      // If bot selection changes and we have thread data, check if thread belongs to new bot
      if (thread && thread.bot_share_name !== newBotSelection) {
        console.log("🔄 Thread Detail: Thread belongs to different bot, redirecting to chats")
        router.push("/chats")
      }

      setSelectedBot(newBotSelection)
    }

    // Get initial bot selection from localStorage
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [thread, router])

  useEffect(() => {
    async function loadData() {
      console.log("🔍 ThreadDetailPage: Received threadId:", threadId)

      // Validate threadId
      if (!threadId || threadId.trim() === "") {
        console.error("❌ ThreadDetailPage: Invalid threadId")
        notFound()
      }

      // Get thread by ID with callback information
      const { data: threadData, error: threadError } = await supabase
        .from("threads")
        .select(`
          *,
          callbacks!callbacks_id_fkey(*)
        `)
        .eq("id", threadId)
        .single()

      if (threadError || !threadData) {
        console.error("❌ ThreadDetailPage: Thread not found for id:", threadId)
        notFound()
      }

      console.log("🔍 ThreadDetailPage: Thread data:", threadData)
      setThread(threadData)

      // Check if thread belongs to currently selected bot
      const currentSelectedBot = localStorage.getItem("selectedBot")
      if (currentSelectedBot && currentSelectedBot !== "null" && threadData.bot_share_name !== currentSelectedBot) {
        console.log("🔄 Thread Detail: Thread doesn't belong to selected bot, redirecting")
        router.push("/chats")
        return
      }

      // Get messages using the thread ID
      const messagesData = await getMessagesByThreadId(threadData.id)
      console.log("🔍 ThreadDetailPage: Messages data:", messagesData)
      setMessages(messagesData)
      setLoading(false)
    }

    loadData()
  }, [threadId, router])

  const handleStarMessage = async (messageId: string) => {
    try {
      // Find the current message
      const currentMessage = messages.find((m) => m.id === messageId)
      if (!currentMessage) return

      const newStarredStatus = !currentMessage.starred

      // Optimistically update the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === messageId ? { ...msg, starred: newStarredStatus } : msg)),
      )

      // Update in database
      const { error } = await supabase.from("messages").update({ starred: newStarredStatus }).eq("id", messageId)

      if (error) {
        console.error("Error starring message:", error)
        // Revert the optimistic update on error
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg.id === messageId ? { ...msg, starred: !newStarredStatus } : msg)),
        )
      }
    } catch (error) {
      console.error("Error starring message:", error)
    }
  }

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 7) return "😊"
    if (sentiment >= 4) return "😐"
    return "😞"
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

  const formatMeanResponseTime = (meanResponseTime?: number) => {
    if (meanResponseTime === undefined || meanResponseTime === null) return "N/A"
    const seconds = meanResponseTime / 1000
    return `${seconds.toFixed(2)}s`
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "Not provided"
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen bg-[#fdfdfd]">
      {/* Left Panel - Thread Information */}
      <div className="w-1/3 border-r border-[#e0e0e0] bg-white overflow-y-auto">
        <div className="p-6">
          <button onClick={() => router.back()} className="flex items-center text-[#616161] hover:text-[#212121] mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>

          <h1 className="text-xl font-semibold text-[#212121] mb-6">Thread Details</h1>

          {/* Show bot mismatch warning if applicable */}
          {selectedBot && thread && thread.bot_share_name !== selectedBot && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ This thread belongs to a different bot ({thread.bot_share_name}) than currently selected (
                {selectedBot})
              </p>
            </div>
          )}

          {/* Callback Basic Info - Always show if callbacks exists */}
          {thread?.callbacks && (
            <div className="bg-blue-100 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-[#616161] uppercase tracking-wider mb-3 flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                Callback
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Created At */}
                <div>
                  <p className="text-xs text-[#616161] font-medium">Created At</p>
                  <p className="text-sm text-[#212121]">
                    {new Date(thread.callbacks.created_at).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>

                {/* Name */}
                {(thread.callbacks.user_name || thread.callbacks.user_first_name || thread.callbacks.user_surname) && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Name</p>
                    <p className="text-sm text-[#212121]">
                      {thread.callbacks.user_name ||
                        `${thread.callbacks.user_first_name || ""} ${thread.callbacks.user_surname || ""}`.trim()}
                    </p>
                  </div>
                )}

                {/* Email */}
                {thread.callbacks.user_email && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Email</p>
                    <p className="text-sm text-[#212121]">{thread.callbacks.user_email}</p>
                  </div>
                )}

                {/* Phone */}
                {thread.callbacks.user_phone && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Phone</p>
                    <p className="text-sm text-[#212121]">{formatPhoneNumber(thread.callbacks.user_phone)}</p>
                  </div>
                )}

                {/* Company */}
                {thread.callbacks.user_company && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Company</p>
                    <p className="text-sm text-[#212121]">{thread.callbacks.user_company}</p>
                  </div>
                )}

                {/* Country */}
                {thread.callbacks.user_country && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Country</p>
                    <p className="text-sm text-[#212121]">{thread.callbacks.user_country}</p>
                  </div>
                )}

                {/* Website */}
                {thread.callbacks.user_url && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Website</p>
                    <a
                      href={thread.callbacks.user_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#038a71] hover:underline break-all"
                    >
                      {thread.callbacks.user_url}
                    </a>
                  </div>
                )}

                {/* Revenue */}
                {thread.callbacks.user_revenue && (
                  <div>
                    <p className="text-xs text-[#616161] font-medium">Revenue</p>
                    <p className="text-sm text-[#212121]">{thread.callbacks.user_revenue}</p>
                  </div>
                )}
              </div>

              {/* Message - full width if present */}
              {thread.callbacks.user_cb_message && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <p className="text-xs text-[#616161] font-medium mb-1">Message</p>
                  <p className="text-sm text-[#212121] bg-white p-3 rounded border leading-relaxed">
                    {thread.callbacks.user_cb_message}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-[#616161] uppercase tracking-wider mb-3">Thread Info</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#616161]">Thread ID</p>
                  <p className="text-sm font-mono text-[#212121]">{thread?.id}</p>
                </div>
                <div>
                  <p className="text-xs text-[#616161]">Bot</p>
                  <p className="text-sm text-[#212121]">{thread?.bot_share_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#616161]">Created At</p>
                  <p className="text-sm text-[#212121]">
                    {new Date(thread?.created_at).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-[#616161] uppercase tracking-wider mb-3">Performance</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-[#616161] mr-2" />
                  <div>
                    <p className="text-xs text-[#616161]">Duration</p>
                    <p className="text-sm text-[#212121]">{formatDuration(thread?.duration)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Timer className="h-4 w-4 text-[#616161] mr-2" />
                  <div>
                    <p className="text-xs text-[#616161]">Avg Response Time</p>
                    <p className="text-sm text-[#212121]">{formatMeanResponseTime(thread?.mean_response_time)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-[#616161] mr-2" />
                  <div>
                    <p className="text-xs text-[#616161]">Messages</p>
                    <p className="text-sm text-[#212121]">{thread?.count || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-[#616161] uppercase tracking-wider mb-3">Sentiment</h3>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{getSentimentEmoji(thread?.sentiment_score)}</span>
                <div>
                  <p className="text-xs text-[#616161]">Score</p>
                  <p className="text-sm font-medium text-[#212121]">
                    {thread?.sentiment_score !== undefined && thread?.sentiment_score !== null
                      ? thread?.sentiment_score
                      : "N/A"}
                  </p>
                </div>
              </div>
              {thread?.sentiment_justification && (
                <div className="mt-3">
                  <p className="text-xs text-[#616161] mb-1">Analysis</p>
                  <p className="text-sm text-[#212121]">{thread?.sentiment_justification}</p>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              {thread?.cb_requested && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-sm font-medium text-orange-800 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Callback Requested
                  </p>
                </div>
              )}
              {thread?.starred && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm font-medium text-yellow-800 flex items-center">⭐ Starred Thread</p>
                </div>
              )}
            </div>

            {/* Callback Details - Show additional details when cb_requested is true */}
            {thread?.cb_requested && thread?.callbacks && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-[#616161] uppercase tracking-wider mb-3 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Callback Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Phone */}
                  {thread.callbacks.user_phone && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Phone</p>
                      <p className="text-sm text-[#212121]">{formatPhoneNumber(thread.callbacks.user_phone)}</p>
                    </div>
                  )}

                  {/* Company */}
                  {thread.callbacks.user_company && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Company</p>
                      <p className="text-sm text-[#212121]">{thread.callbacks.user_company}</p>
                    </div>
                  )}

                  {/* Country */}
                  {thread.callbacks.user_country && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Country</p>
                      <p className="text-sm text-[#212121]">{thread.callbacks.user_country}</p>
                    </div>
                  )}

                  {/* Website */}
                  {thread.callbacks.user_url && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Website</p>
                      <a
                        href={thread.callbacks.user_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#038a71] hover:underline break-all"
                      >
                        {thread.callbacks.user_url}
                      </a>
                    </div>
                  )}

                  {/* Revenue */}
                  {thread.callbacks.user_revenue && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Revenue</p>
                      <p className="text-sm text-[#212121]">{thread.callbacks.user_revenue}</p>
                    </div>
                  )}

                  {/* IP Address */}
                  {thread.callbacks.user_ip && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">IP Address</p>
                      <p className="text-sm text-[#212121] font-mono">{thread.callbacks.user_ip}</p>
                    </div>
                  )}

                  {/* Document Referrer */}
                  {thread.callbacks.document_referrer && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">Referrer</p>
                      <p className="text-sm text-[#212121] break-all">{thread.callbacks.document_referrer}</p>
                    </div>
                  )}

                  {/* IBData */}
                  {thread.callbacks.ibdata && (
                    <div>
                      <p className="text-xs text-[#616161] font-medium">IB Data</p>
                      <p className="text-sm text-[#212121]">{thread.callbacks.ibdata}</p>
                    </div>
                  )}
                </div>

                {/* Message - full width if present */}
                {thread.callbacks.user_cb_message && (
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <p className="text-xs text-[#616161] font-medium mb-1">Message</p>
                    <p className="text-sm text-[#212121] bg-white p-3 rounded border leading-relaxed">
                      {thread.callbacks.user_cb_message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Messages */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b border-[#e0e0e0] p-4">
          <h2 className="text-lg font-medium text-[#212121]">{thread?.message_preview || "Chat Transcript"}</h2>
          <p className="text-sm text-[#616161]">{messages.length} messages</p>
        </div>

        <div className="flex-1 overflow-y-auto px-[10%] py-4 space-y-4">
          {messages.map((message, index) => {
            const isUserMessage =
              message.role === "user" || message.role === "menu_button" || message.role === "suggested_button"
            const isButtonMessage = message.role === "menu_button" || message.role === "suggested_button"

            // Determine message content based on role
            let messageContent = ""
            if (message.role === "user") {
              messageContent = message.user_message || message.content || "No content"
            } else if (message.role === "menu_button") {
              messageContent = message.content || "No content"
            } else if (message.role === "suggested_button") {
              messageContent = message.suggested_message || message.content || "No content"
            } else if (message.role === "bot") {
              messageContent = message.content || message.bot_message || "No content"
            } else {
              messageContent = message.content || "No content"
            }

            let roleLabel = "AI"
            if (message.role === "user") {
              roleLabel = "User"
            } else if (message.role === "menu_button") {
              roleLabel = "Menu Button"
            } else if (message.role === "suggested_button") {
              roleLabel = "Suggested Button"
            }

            return (
              <div key={message.id} className={`flex ${isUserMessage ? "justify-start" : "justify-end"} mb-8 group`}>
                {/* Star button for user messages - positioned on the left */}
                {isUserMessage && (
                  <button
                    onClick={() => handleStarMessage(message.id)}
                    className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] mr-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        message.starred ? "fill-yellow-400 text-yellow-400 opacity-100" : "text-[#616161]"
                      }`}
                    />
                  </button>
                )}

                <div
                  className={`flex flex-col ${isUserMessage ? "items-start" : "items-end"} max-w-[60%] min-w-[120px]`}
                >
                  <div
                    className={`relative w-full ${
                      isUserMessage
                        ? isButtonMessage
                          ? "bg-green-50 border border-green-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                          : "bg-white border border-[#e0e0e0] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                        : "bg-[#038a71] text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm"
                    }`}
                  >
                    <p
                      className={`text-sm leading-relaxed break-words ${
                        isUserMessage ? (isButtonMessage ? "text-green-800" : "text-[#212121]") : "text-white"
                      }`}
                    >
                      {messageContent}
                    </p>
                  </div>

                  <div className="flex justify-between w-full mt-1 px-1">
                    <span className="text-xs text-[#616161]">{roleLabel}</span>
                    <span className="text-xs text-[#616161]">
                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>

                {/* Star button for bot messages - positioned on the right */}
                {!isUserMessage && (
                  <button
                    onClick={() => handleStarMessage(message.id)}
                    className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        message.starred ? "fill-yellow-400 text-yellow-400 opacity-100" : "text-[#616161]"
                      }`}
                    />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
