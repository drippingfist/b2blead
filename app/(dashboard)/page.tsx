"use client"

import { useEffect, useState } from "react"
import ThreadsView from "@/components/threads-view"
import { getThreadsSimple } from "@/lib/simple-database"
import { getAccessibleBotsClient, getUserBotAccess } from "@/lib/database"
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
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })

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

  // Fetch user access and bots data
  const fetchUserAccessAndBots = async () => {
    if (botsLoaded) return // Prevent multiple calls

    try {
      console.log("🔐 PAGE: Fetching user access...")
      const access = await getUserBotAccess()
      console.log("🔐 PAGE: User access:", access)
      setUserAccess(access)

      if (access.role) {
        console.log("🤖 PAGE: Fetching accessible bots...")
        const botsData = await getAccessibleBotsClient()
        console.log(`🤖 PAGE: Fetched ${botsData.length} accessible bots`)
        setBots(botsData)

        // Auto-select single bot for non-superadmin users
        if (botsData.length === 1 && !access.isSuperAdmin && !selectedBot) {
          const singleBot = botsData[0]
          setSelectedBot(singleBot.bot_share_name)
          localStorage.setItem("selectedBot", singleBot.bot_share_name)
          window.dispatchEvent(new CustomEvent("botSelectionChanged", { detail: singleBot.bot_share_name }))
        }
      }
    } catch (error: any) {
      console.error("❌ PAGE: Error fetching user access and bots:", error)
      setError("Failed to load user permissions")
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

  // Fetch user access and bots on component mount
  useEffect(() => {
    fetchUserAccessAndBots()
  }, [botsLoaded])

  useEffect(() => {
    if (userAccess.role) {
      fetchThreads()
    }
  }, [selectedBot, userAccess.role])

  // Get timezone for the selected bot
  const getSelectedBotTimezone = (): string => {
    if (!selectedBot || !bots.length) return "UTC"
    const bot = bots.find((b) => b.bot_share_name === selectedBot)
    return bot?.timezone || "UTC"
  }

  const selectedBotTimezone = getSelectedBotTimezone()

  // Show loading state
  if (!botsLoaded || (userAccess.role && loading && threads.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  // Show access denied if no role
  if (!userAccess.role) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md text-center">
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p>You don't have access to any bots. Please contact an administrator to get access.</p>
        </div>
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
            <div className="flex items-center space-x-2">
              <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                Timezone: {selectedBotTimezone}
              </Button>
              {userAccess.isSuperAdmin && (
                <Button variant="outline" className="bg-green-50 border-green-200 text-green-700">
                  SuperAdmin
                </Button>
              )}
              {userAccess.role && (
                <Button variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 capitalize">
                  {userAccess.role}
                </Button>
              )}
            </div>
          </div>
          <p className="text-[#616161] mb-4">
            View all your chat threads with customers.
            {userAccess.isSuperAdmin
              ? " You have superadmin access to all bots."
              : ` You have access to ${bots.length} bot(s).`}
          </p>
        </div>
      </div>

      <ThreadsView initialThreads={threads} selectedBot={selectedBot} onRefresh={fetchThreads} bots={bots} />
    </div>
  )
}
