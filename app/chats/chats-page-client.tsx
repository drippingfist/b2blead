"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChatsHeader } from "./chats-header"
import ChatsList from "./chats-list"

interface Thread {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  updated_at: string
  duration?: string
  message_preview?: string
  sentiment_score?: number
  sentiment_justification?: string
  cb_requested?: boolean
  count?: number
  mean_response_time?: number
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
    console.log("🕐 ChatsPageClient: Time period changed to:", newTimePeriod)
    setSelectedTimePeriod(newTimePeriod)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <>
      <ChatsHeader selectedTimePeriod={selectedTimePeriod} onTimePeriodChange={handleTimePeriodChange} />

      <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
        <strong>Debug Info:</strong>
        <br />
        Selected Time Period: {selectedTimePeriod}
        <br />
        Initial Bot: {initialSelectedBot || "All Bots"}
        <br />
        Bot Display Name: {currentBotNameToDisplay}
        <br />
        Accessible Bots: {accessibleBotShareNames.length}
        <br />
        SuperAdmin: {isSuperAdmin.toString()}
      </div>

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
