"use client"

import { useState, useEffect } from "react"
import { MessagesView } from "@/components/messages-view"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"
import { useRouter } from "next/navigation"
import Loading from "@/components/loading"
import { useBotSelection } from "@/hooks/use-bot-selection"

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
  const { selectedBot, isSelectionLoaded } = useBotSelection()
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate)
  const [threadsWithMessages, setThreadsWithMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load messages data only when bot selection is ready
  useEffect(() => {
    const fetchData = async () => {
      if (!isSelectionLoaded) {
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
  }, [selectedBot, selectedDate, isSelectionLoaded])

  if (loading || !isSelectionLoaded) {
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
