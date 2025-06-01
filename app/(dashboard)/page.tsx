"use client"

import { useEffect, useState } from "react"
import ThreadsView from "@/components/threads-view"
import { getThreadsSimple } from "@/lib/simple-database"
import { getBotsClient } from "@/lib/database"
import type { Thread } from "@/lib/simple-database"
import type { Bot } from "@/lib/database"
import { Button } from "@/components/ui/button"

export default function ChatsPage() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [botsLoaded, setBotsLoaded] = useState(false)

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

  // Fetch bots data with rate limiting protection
  const fetchBots = async () => {
    if (botsLoaded) return // Prevent multiple calls

    try {
      console.log("🤖 PAGE: Fetching bots...")
      const botsData = await getBotsClient()
      console.log(`🤖 PAGE: Fetched ${botsData.length} bots`)
      setBots(botsData)
    } catch (error: any) {
      console.error("❌ PAGE: Error fetching bots:", error)
      // Set empty array on error to prevent infinite loading
      setBots([])
    } finally {
      setBotsLoaded(true)
    }
  }

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

  // Fetch bots on component mount
  useEffect(() => {
    fetchBots()
  }, [botsLoaded])

  useEffect(() => {
    fetchThreads()
  }, [selectedBot])

  // Get timezone for the selected bot
  const getSelectedBotTimezone = (): string => {
    if (!selectedBot || !bots.length) return "UTC"
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone || "UTC"
  }

  const selectedBotTimezone = getSelectedBotTimezone()

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
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="p-4 md:p-8 pb-0">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-[#212121]">Chats</h1>
            <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              Timezone: {selectedBotTimezone}
            </Button>
          </div>
          <p className="text-[#616161] mb-4">View all your chat threads with customers.</p>
        </div>
      </div>

      <ThreadsView initialThreads={threads} selectedBot={selectedBot} onRefresh={fetchThreads} bots={bots} />
    </div>
  )
}
