"use client"

import { useState, useEffect } from "react"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"
import { MessagesView } from "@/components/messages-view"

interface Bot {
  bot_share_name: string
  client_name: string
}

interface MessagesPageClientProps {
  bots: Bot[]
}

export function MessagesPageClient({ bots }: MessagesPageClientProps) {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [threadsWithMessages, setThreadsWithMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [botSelectionReady, setBotSelectionReady] = useState(false)

  // Initialize bot selection from localStorage (same as dashboard)
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    console.log("📧 Messages: Retrieved bot from localStorage:", storedBot)

    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    } else {
      setSelectedBot(null)
    }
    setBotSelectionReady(true)
  }, [])

  // Load threads when bot selection is ready (same as dashboard)
  useEffect(() => {
    const loadThreads = async () => {
      if (!botSelectionReady) {
        console.log("📧 Messages: Waiting for bot selection to be ready...")
        return
      }

      console.log("📧 Messages: Loading threads for bot:", selectedBot)
      setLoading(true)

      try {
        const threads = await getRecentThreadsWithMessages(selectedBot, 10, 0, selectedDate)
        console.log("📧 Messages: Loaded", threads.length, "threads")
        setThreadsWithMessages(threads)
      } catch (error) {
        console.error("❌ Messages: Error loading threads:", error)
      } finally {
        setLoading(false)
      }
    }

    loadThreads()
  }, [selectedBot, selectedDate, botSelectionReady])

  if (loading || !botSelectionReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
        <span className="ml-2 text-gray-600">Loading messages...</span>
      </div>
    )
  }

  return (
    <MessagesView
      threadsWithMessages={threadsWithMessages}
      bots={bots}
      selectedBot={selectedBot}
      selectedDate={selectedDate}
    />
  )
}
