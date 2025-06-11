"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ChatsHeader from "./chats-header"
import ChatsList from "./chats-list"
import type { Thread } from "@/lib/simple-database"

interface ChatsPageClientProps {
  initialThreads: Thread[]
  selectedBot: string | null
  selectedTimePeriod: string
  actualTotalCount: number
  botDisplayName: string | null
  timezoneAbbr: string
  accessibleBotShareNames: string[]
}

export default function ChatsPageClient({
  initialThreads,
  selectedBot,
  selectedTimePeriod,
  actualTotalCount,
  botDisplayName,
  timezoneAbbr,
  accessibleBotShareNames,
}: ChatsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Save the current time period to localStorage for persistence
    if (selectedTimePeriod) {
      localStorage.setItem("chats-time-period", selectedTimePeriod)
      console.log("💾 Saved time period to localStorage:", selectedTimePeriod)
    }
  }, [selectedTimePeriod])

  const handleTimePeriodChange = (value: string) => {
    console.log("🕐 ChatsPageClient: Time period changed to:", value)

    // Save to localStorage immediately
    localStorage.setItem("chats-time-period", value)

    // Create a new URLSearchParams object based on the current URL search parameters
    const params = new URLSearchParams(searchParams.toString())

    // Update the timePeriod parameter
    params.set("timePeriod", value)

    // If there's a bot parameter, keep it
    if (selectedBot) {
      params.set("bot", selectedBot)
    }

    // Navigate to the new URL with updated search parameters - this will trigger a full page reload
    router.push(`/chats?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <ChatsHeader
        botDisplayName={botDisplayName}
        selectedBot={selectedBot}
        selectedTimePeriod={selectedTimePeriod}
        totalThreads={actualTotalCount}
        timezoneAbbr={timezoneAbbr}
        onTimePeriodChange={handleTimePeriodChange}
      />

      {isClient && (
        <ChatsList
          key={`threads-${selectedBot}-${selectedTimePeriod}`}
          initialThreads={initialThreads}
          selectedBot={selectedBot}
          selectedTimePeriod={selectedTimePeriod}
          totalCount={actualTotalCount}
          accessibleBotShareNames={accessibleBotShareNames}
        />
      )}

      <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
        <strong>Debug Info:</strong>
        <br />
        Selected Time Period: {selectedTimePeriod}
        <br />
        Selected Bot: {selectedBot || "All Bots"}
        <br />
        Bot Display Name: {botDisplayName}
        <br />
        Actual Total Count: {actualTotalCount}
        <br />
        Threads Displayed: {initialThreads.length}
        <br />
        Timezone: {timezoneAbbr}
      </div>
    </div>
  )
}
