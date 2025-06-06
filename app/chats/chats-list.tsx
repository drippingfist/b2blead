"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { getThreadsSimple } from "@/lib/simple-database"
import Link from "next/link"
import { Clock, MessageSquare, Phone, Star, Trash2 } from "lucide-react"
import { formatTimeInTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"

interface Thread {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  updated_at: string
  duration?: string
  message_preview?: string
  sentiment_score?: number
  sentiment_justification?: string
  cb_requested?: boolean
  count?: number
  mean_response_time?: number
  starred?: boolean
  callbacks?: any
}

interface ChatsListProps {
  selectedBot: string | null
  isSuperAdmin?: boolean
  onRefresh?: () => void
}

export default function ChatsList({ selectedBot, isSuperAdmin = false, onRefresh }: ChatsListProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [botTimezone, setBotTimezone] = useState<string>("UTC")

  useEffect(() => {
    loadThreads()
  }, [selectedBot])

  const loadThreads = async () => {
    try {
      setLoading(true)
      const threadsData = await getThreadsSimple(50, selectedBot)

      // Filter out threads with count < 1
      const validThreads = threadsData.filter((thread) => (thread.count || 0) >= 1)
      setThreads(validThreads)

      // Get bot timezone if we have a selected bot
      if (selectedBot) {
        const { data: bot } = await supabase.from("bots").select("timezone").eq("bot_share_name", selectedBot).single()

        if (bot?.timezone) {
          setBotTimezone(bot.timezone)
        }
      }
    } catch (error) {
      console.error("Error loading threads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedThreads.size === threads.length) {
      setSelectedThreads(new Set())
    } else {
      setSelectedThreads(new Set(threads.map((t) => t.id)))
    }
  }

  const handleSelectThread = (threadId: string) => {
    const newSelected = new Set(selectedThreads)
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId)
    } else {
      newSelected.add(threadId)
    }
    setSelectedThreads(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedThreads.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch("/api/delete-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadIds: Array.from(selectedThreads) }),
      })

      if (response.ok) {
        setSelectedThreads(new Set())
        loadThreads() // Refresh the list
        onRefresh?.() // Trigger parent refresh if needed
      } else {
        console.error("Failed to delete threads")
      }
    } catch (error) {
      console.error("Error deleting threads:", error)
    } finally {
      setDeleting(false)
    }
  }

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 7) return "😊"
    if (sentiment >= 4) return "😐"
    return "😞"
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
    return <div className="p-4">Loading threads...</div>
  }

  const timezoneAbbr = getTimezoneAbbreviation(botTimezone)

  return (
    <div className="space-y-4">
      {/* Superadmin Controls */}
      {isSuperAdmin && threads.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedThreads.size === threads.length && threads.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Select All</span>
            </label>
            {selectedThreads.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedThreads.size} thread{selectedThreads.size !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          {selectedThreads.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleting ? "Deleting..." : "Delete Selected"}</span>
            </button>
          )}
        </div>
      )}

      {threads.length > 0 && (
        <p className="text-sm text-[#616161] px-4">
          {threads.length} thread{threads.length !== 1 ? "s" : ""} • Times in {timezoneAbbr}
        </p>
      )}

      {threads.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <p className="text-[#616161]">No chats found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <div key={thread.id} className="border border-[#e0e0e0] rounded-lg overflow-hidden bg-white">
              {/* Thread Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Superadmin Checkbox */}
                    {isSuperAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedThreads.has(thread.id)}
                        onChange={() => handleSelectThread(thread.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <Link href={`/chats/${thread.id}`} className="font-medium text-[#212121] hover:text-[#038a71]">
                          Thread {thread.thread_id || thread.id.slice(0, 8)}
                        </Link>
                        {thread.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        {thread.cb_requested && (
                          <div className="flex items-center space-x-1 text-[#038a71]">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm font-medium">Callback</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-[#616161] mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimeInTimezone(thread.created_at, botTimezone)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{getSentimentEmoji(thread.sentiment_score)}</span>
                          <span>Sentiment</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{thread.count || 0} messages</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Avg: {formatMeanResponseTime(thread.mean_response_time)}</span>
                        </div>
                      </div>

                      {/* Message Preview */}
                      <div className="text-sm text-[#616161] mb-3">
                        <p className="line-clamp-2">{thread.message_preview || "No preview available"}</p>
                      </div>

                      {/* Callback Information - Prominent Display */}
                      {thread.callbacks && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            Callback Request
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {/* Name */}
                            {(thread.callbacks.user_name ||
                              thread.callbacks.user_first_name ||
                              thread.callbacks.user_surname) && (
                              <div>
                                <span className="font-medium text-blue-700">Name: </span>
                                <span className="text-blue-900">
                                  {thread.callbacks.user_name ||
                                    `${thread.callbacks.user_first_name || ""} ${thread.callbacks.user_surname || ""}`.trim()}
                                </span>
                              </div>
                            )}

                            {/* Email */}
                            {thread.callbacks.user_email && (
                              <div>
                                <span className="font-medium text-blue-700">Email: </span>
                                <span className="text-blue-900">{thread.callbacks.user_email}</span>
                              </div>
                            )}

                            {/* Phone */}
                            {thread.callbacks.user_phone && (
                              <div>
                                <span className="font-medium text-blue-700">Phone: </span>
                                <span className="text-blue-900">{formatPhoneNumber(thread.callbacks.user_phone)}</span>
                              </div>
                            )}

                            {/* Company */}
                            {thread.callbacks.user_company && (
                              <div>
                                <span className="font-medium text-blue-700">Company: </span>
                                <span className="text-blue-900">{thread.callbacks.user_company}</span>
                              </div>
                            )}
                          </div>

                          {/* Callback Message */}
                          {thread.callbacks.user_cb_message && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <span className="font-medium text-blue-700">Message: </span>
                              <p className="text-blue-900 mt-1">{thread.callbacks.user_cb_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
