"use client"

import { useEffect, useState } from "react"
import ThreadsView from "@/components/threads-view"
import { useBotContext } from "@/contexts/bot-context"
import { getThreadsClient } from "@/lib/database"
import type { Thread } from "@/lib/database"

export default function ChatsPage() {
  const { selectedBot } = useBotContext()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchThreads = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🧵 Fetching threads for bot:", selectedBot)
      const threadsData = await getThreadsClient(100, selectedBot)
      console.log(`🧵 Fetched ${threadsData.length} threads:`, threadsData)
      setThreads(threadsData)
    } catch (error: any) {
      console.error("❌ Error fetching threads:", error)
      setError(error.message || "An error occurred while fetching threads")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [selectedBot])

  const handleRefresh = async () => {
    await fetchThreads()
  }

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
            Selected bot: {selectedBot || "All bots"} | Threads found: {threads.length}
          </div>
        </div>
      </div>

      <ThreadsView initialThreads={threads} selectedBot={selectedBot} onRefresh={handleRefresh} bots={[]} />
    </div>
  )
}
