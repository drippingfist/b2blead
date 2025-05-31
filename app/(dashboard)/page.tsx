"use client"

import { useEffect, useState } from "react"
import ThreadsView from "@/components/threads-view"
import { getThreadsSimple } from "@/lib/simple-database"
import type { Thread } from "@/lib/simple-database"

export default function ChatsPage() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load selected bot from localStorage
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }
  }, [])

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  const fetchThreads = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("🧵 PAGE: Fetching threads for bot_share_name:", selectedBot)
      const threadsData = await getThreadsSimple(100, selectedBot)
      console.log(`🧵 PAGE: Fetched ${threadsData.length} threads`)
      setThreads(threadsData)
    } catch (error: any) {
      console.error("❌ PAGE: Error fetching threads:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [selectedBot])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error loading chats</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="p-4 md:p-8 pb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
          <p className="text-[#616161] mb-4">
            View all your chat threads with customers. Use the bot selector in the sidebar to filter by specific bots.
          </p>
          {/* Debug info */}
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
            Selected bot_share_name: {selectedBot || "All bots"} | Threads found: {threads.length}
          </div>
        </div>
      </div>

      <ThreadsView initialThreads={threads} selectedBot={selectedBot} onRefresh={fetchThreads} bots={[]} />
    </div>
  )
}
