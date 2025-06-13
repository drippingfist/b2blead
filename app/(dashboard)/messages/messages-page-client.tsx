"use client"

import { useState, useEffect } from "react"
import { MessagesView } from "@/components/messages-view"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"
import { useRouter } from "next/navigation"
import Loading from "@/components/loading"
import { supabase } from "@/lib/supabase"

interface Bot {
  bot_share_name: string
  client_name: string
}

interface MessagesPageClientProps {
  bots: Bot[]
  selectedBot: string | null
  selectedDate: string | null
  userAccess: {
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  } | null
}

export function MessagesPageClient({
  bots,
  selectedBot: initialSelectedBot,
  selectedDate: initialSelectedDate,
  userAccess,
}: MessagesPageClientProps) {
  const [selectedBot, setSelectedBot] = useState<string | null>(initialSelectedBot)
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate)
  const [threadsWithMessages, setThreadsWithMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [botSelectionReady, setBotSelectionReady] = useState(false)
  const router = useRouter()
  const [botData, setBotData] = useState<any>(null)

  // Initialize bot selection from localStorage (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const initializeBotSelection = async () => {
      try {
        console.log("🔍 Messages: Initializing bot selection...")

        // Get stored bot selection
        const storedBot = localStorage.getItem("selectedBot")
        console.log("🔍 Messages: Stored bot selection:", storedBot)

        // Determine proper bot selection based on user access (SAME AS DASHBOARD)
        if (userAccess?.isSuperAdmin) {
          // Superadmin: can select "All Bots" (null) or specific bot
          if (storedBot && storedBot !== "null") {
            setSelectedBot(storedBot)
            console.log("🔍 Messages: Superadmin using stored bot:", storedBot)
          } else {
            // Default to "All Bots" for superadmin if no specific selection
            setSelectedBot(null)
            console.log("🔍 Messages: Superadmin defaulting to All Bots")
          }
        } else {
          // Regular user: must select a specific bot, never "All Bots"
          if (storedBot && storedBot !== "null" && userAccess?.accessibleBots.includes(storedBot)) {
            setSelectedBot(storedBot)
            console.log("🔍 Messages: Regular user using stored bot:", storedBot)
          } else if (bots.length > 0) {
            // Auto-select first available bot for regular users
            const firstBot = bots[0]
            setSelectedBot(firstBot.bot_share_name)
            localStorage.setItem("selectedBot", firstBot.bot_share_name)
            console.log("🔍 Messages: Regular user auto-selected first bot:", firstBot.bot_share_name)
          } else if (userAccess?.accessibleBots.length > 0) {
            // Fallback to first accessible bot from access info
            const firstAccessibleBot = userAccess.accessibleBots[0]
            setSelectedBot(firstAccessibleBot)
            localStorage.setItem("selectedBot", firstAccessibleBot)
            console.log("🔍 Messages: Regular user using first accessible bot:", firstAccessibleBot)
          }
        }

        setBotSelectionReady(true)
        console.log("🔍 Messages: Bot selection ready")
      } catch (error) {
        console.error("❌ Messages: Error initializing bot selection:", error)
        setBotSelectionReady(true) // Still allow page to load
      }
    }

    initializeBotSelection()
  }, [userAccess, bots])

  // Listen for bot selection changes (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      console.log("🔍 Messages: Bot selection changed to:", event.detail)
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  // Listen for bots being loaded by other components (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const handleBotsLoaded = (event: CustomEvent) => {
      console.log("🔍 Messages: Bots loaded:", event.detail)
      // Update bots if needed
    }

    window.addEventListener("botsLoaded", handleBotsLoaded as EventListener)
    return () => window.removeEventListener("botsLoaded", handleBotsLoaded as EventListener)
  }, [])

  // Load messages data only when bot selection is ready (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const fetchData = async () => {
      if (!botSelectionReady) {
        console.log("🔍 Messages: Waiting for bot selection to be ready...")
        return
      }

      console.log("🔍 Messages: Loading data for bot:", selectedBot)
      setLoading(true)

      try {
        const threads = await getRecentThreadsWithMessages(selectedBot, 10, 0, selectedDate)
        setThreadsWithMessages(threads)
        console.log("✅ Messages: Data loaded successfully")
      } catch (error) {
        console.error("❌ Messages: Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    const loadBotData = async () => {
      if (selectedBot) {
        const { data: bot } = await supabase
          .from("bots")
          .select("id, bot_share_name, client_name, timezone")
          .eq("bot_share_name", selectedBot)
          .single()

        setBotData(bot)
      } else {
        setBotData(null)
      }
    }

    fetchData()
    loadBotData()
  }, [selectedBot, selectedDate, botSelectionReady])

  if (loading || !botSelectionReady) {
    return <Loading message="Loading messages..." />
  }

  return (
    <MessagesView
      threadsWithMessages={threadsWithMessages}
      bots={bots}
      selectedBot={selectedBot}
      selectedDate={selectedDate}
      botData={botData}
    />
  )
}
