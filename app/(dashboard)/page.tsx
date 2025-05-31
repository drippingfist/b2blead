"use client"

import { useEffect, useState } from "react"
import ThreadsView from "@/components/threads-view"
import BotSelector from "@/components/bot-selector"
import { supabase } from "@/lib/supabase/client"
import type { Thread, Bot } from "@/lib/database"

export default function ChatsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBotsAndThreads = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Fetching bots and threads...")

      // Fetch all bots (including timezone information)
      const { data: botsData, error: botsError } = await supabase
        .from("bots")
        .select("*")
        .order("client_name", { ascending: true })

      if (botsError) {
        console.error("Error fetching bots:", botsError)
        setError(botsError.message)
        return
      }

      setBots(botsData || [])

      // Fetch threads - filter by selected bot if one is chosen
      // Make sure to include the count column
      let threadsQuery = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(100)

      if (selectedBot) {
        threadsQuery = threadsQuery.eq("bot_share_name", selectedBot)
      }

      const { data: threadsData, error: threadsError } = await threadsQuery

      console.log("Threads query result:", {
        data: threadsData,
        dataLength: threadsData?.length || 0,
        error: threadsError,
        selectedBot,
      })

      if (threadsError) {
        console.error("Error fetching threads:", threadsError)
        setError(threadsError.message)
      } else {
        console.log("Setting threads:", threadsData?.length || 0, "threads found")
        setThreads(threadsData || [])
      }
    } catch (error: any) {
      console.error("Error in fetchBotsAndThreads:", error)
      setError(error.message || "An error occurred while fetching data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBotsAndThreads()
  }, [selectedBot]) // Re-fetch when selected bot changes

  const handleSelectBot = (botShareName: string) => {
    setSelectedBot(botShareName)
  }

  const handleRefresh = async () => {
    console.log("Refreshing data...")
    await fetchBotsAndThreads()
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
      {/* Bot Selector */}
      <div className="p-4 md:p-8 pb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Chats</h1>
          <p className="text-[#616161] mb-4">View all your chat threads with customers.</p>

          {bots.length > 0 && (
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-[#212121] mb-2">Filter by Bot</label>
              <BotSelector bots={bots} selectedBot={selectedBot} onSelectBot={handleSelectBot} />
            </div>
          )}
        </div>
      </div>

      <ThreadsView initialThreads={threads} selectedBot={selectedBot} onRefresh={handleRefresh} bots={bots} />
    </div>
  )
}
