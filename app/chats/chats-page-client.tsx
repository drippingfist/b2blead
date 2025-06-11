"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ChatsHeader from "./chats-header"
import ChatsList from "./chats-list"
import type { Thread } from "@/lib/simple-database"

interface ChatsPageClientProps {
  initialThreads: Thread[]
  selectedBot: string | null
  initialTimePeriod: string // This comes from server
  totalCount: number
  botDisplayName: string | null
  timezoneAbbr: string
  accessibleBotShareNames: string[]
  currentPage: number
  pageSize: number
}

export default function ChatsPageClient({
  initialThreads,
  selectedBot,
  initialTimePeriod,
  totalCount,
  botDisplayName,
  timezoneAbbr,
  accessibleBotShareNames,
  currentPage,
  pageSize,
}: ChatsPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Use the actual time period from URL params, not the initial prop
  const currentTimePeriod = searchParams.get("timePeriod") || initialTimePeriod

  useEffect(() => {
    setIsClient(true)
    console.log("🔍 ChatsPageClient mounted:")
    console.log("  - URL timePeriod:", searchParams.get("timePeriod"))
    console.log("  - Initial timePeriod:", initialTimePeriod)
    console.log("  - Current timePeriod:", currentTimePeriod)
  }, [searchParams, initialTimePeriod, currentTimePeriod])

  const handleTimePeriodChange = useCallback(
    (newTimePeriod: string) => {
      console.log("🕐 Time period changing from", currentTimePeriod, "to", newTimePeriod)
      setIsLoading(true)

      const params = new URLSearchParams(searchParams.toString())
      params.set("timePeriod", newTimePeriod)
      params.set("page", "1") // Reset to page 1

      if (selectedBot) {
        params.set("bot", selectedBot)
      }

      console.log("🔄 Navigating to:", `/chats?${params.toString()}`)
      router.push(`/chats?${params.toString()}`)
    },
    [router, searchParams, selectedBot, currentTimePeriod],
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      console.log("📄 Page changing to:", newPage)
      setIsLoading(true)

      const params = new URLSearchParams(searchParams.toString())
      params.set("page", newPage.toString())

      router.push(`/chats?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <ChatsHeader
        botDisplayName={botDisplayName}
        selectedBot={selectedBot}
        selectedTimePeriod={currentTimePeriod} // Use the current time period from URL
        totalThreadsForPeriod={totalCount}
        timezoneAbbr={timezoneAbbr}
        onTimePeriodChange={handleTimePeriodChange}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />

      {isClient && (
        <ChatsList
          key={`threads-${selectedBot}-${currentTimePeriod}-${currentPage}`}
          initialThreads={initialThreads}
          selectedBot={selectedBot}
          selectedTimePeriod={currentTimePeriod}
          totalCount={totalCount}
          accessibleBotShareNames={accessibleBotShareNames}
        />
      )}

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
        <strong>🔍 Debug - Time Period Sources:</strong>
        <br />
        URL timePeriod param: {searchParams.get("timePeriod") || "null"}
        <br />
        Initial timePeriod prop: {initialTimePeriod}
        <br />
        Current timePeriod used: {currentTimePeriod}
        <br />
        Selected Bot: {selectedBot || "All Bots"}
        <br />
        Total Count: {totalCount}
        <br />
        Current Page: {currentPage}
      </div>
    </div>
  )
}
