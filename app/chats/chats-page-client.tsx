"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ChatsList from "./chats-list"
import { ChatsHeader } from "./chats-header"

interface Thread {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  updated_at: string
  duration?: string | null
  message_preview?: string
  sentiment_score?: number
  cb_requested?: boolean
  count?: number
  starred?: boolean
  callbacks?: any
  bots?: {
    client_name?: string
    bot_display_name?: string
    timezone?: string
  } | null
}

interface ChatsPageClientProps {
  initialThreads: Thread[]
  isSuperAdmin: boolean
  initialTotalThreads: number
  initialBotDisplayName: string | null
  initialSelectedBot: string | null
  defaultTimePeriodValue: string
  accessibleBotShareNames: string[]
  initialTimezoneAbbr: string
}

export default function ChatsPageClient({
  initialThreads,
  isSuperAdmin,
  initialTotalThreads,
  initialBotDisplayName,
  initialSelectedBot,
  defaultTimePeriodValue,
  accessibleBotShareNames,
  initialTimezoneAbbr,
}: ChatsPageClientProps) {
  const router = useRouter()
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>(defaultTimePeriodValue)
  const [currentTimezoneAbbr, setCurrentTimezoneAbbr] = useState<string>(initialTimezoneAbbr)
  const [currentBotNameToDisplay, setCurrentBotNameToDisplay] = useState<string | null>(initialBotDisplayName)

  const handleTimePeriodChange = (newTimePeriod: string) => {
    setSelectedTimePeriod(newTimePeriod)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <>
      <ChatsHeader selectedTimePeriod={selectedTimePeriod} onTimePeriodChange={handleTimePeriodChange} />
      <ChatsList
        key={`${initialSelectedBot || "all"}-${selectedTimePeriod}`}
        selectedBot={initialSelectedBot}
        isSuperAdmin={isSuperAdmin}
        initialThreads={initialThreads}
        initialTotalThreads={initialTotalThreads}
        initialBotDisplayName={currentBotNameToDisplay}
        selectedTimePeriod={selectedTimePeriod}
        accessibleBotShareNames={accessibleBotShareNames}
        setCurrentTimezoneAbbr={setCurrentTimezoneAbbr}
        setCurrentBotNameToDisplay={setCurrentBotNameToDisplay}
        onRefresh={handleRefresh}
      />
    </>
  )
}
