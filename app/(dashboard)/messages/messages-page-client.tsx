"use client"

import { useState, useEffect } from "react"
import { MessagesView } from "@/components/messages-view"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"
import { useRouter } from "next/navigation"
import Loading from "@/components/loading"

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

  // Initialize bot selection from localStorage (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const initializeBotSelection = async () => {
      try {
        // Get stored bot selection
        const storedBot = localStorage.getItem("selectedBot")

        // Determine proper bot selection based on user access (SAME AS DASHBOARD)
        if (userAccess?.isSuperAdmin) {
          // Superadmin: can select "All Bots" (null) or specific bot
          if (storedBot && storedBot !== "null") {
            setSelectedBot(storedBot)
          } else {
            // Default to "All Bots" for superadmin if no specific selection
            setSelectedBot(null)
          }
        } else {
          // Regular user: must select a specific bot, never "All Bots"
          if (storedBot && storedBot !== "null" && userAccess?.accessibleBots.includes(storedBot)) {
            setSelectedBot(storedBot)
          } else if (bots.length > 0) {
            // Auto-select first available bot for regular users
            const firstBot = bots[0]
            setSelectedBot(firstBot.bot_share_name)
            localStorage.setItem("selectedBot", firstBot.bot_share_name)
          } else if (userAccess?.accessibleBots.length > 0) {
            // Fallback to first accessible bot from access info
            const firstAccessibleBot = userAccess.accessibleBots[0]
            setSelectedBot(firstAccessibleBot)
            localStorage.setItem("selectedBot", firstAccessibleBot)
          }
        }

        setBotSelectionReady(true)
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
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  // Listen for bots being loaded by other components (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const handleBotsLoaded = (event: CustomEvent) => {
      // Update bots if needed
    }

    window.addEventListener("botsLoaded", handleBotsLoaded as EventListener)
    return () => window.removeEventListener("botsLoaded", handleBotsLoaded as EventListener)
  }, [])

  // Load messages data only when bot selection is ready (EXACT SAME AS DASHBOARD)
  useEffect(() => {
    const fetchData = async () => {
      if (!botSelectionReady) {
        return
      }

      setLoading(true)

      try {
        const threads = await getRecentThreadsWithMessages(selectedBot, 10, 0, selectedDate)
        setThreadsWithMessages(threads)
      } catch (error) {
        console.error("❌ Messages: Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
    />
  )
}
