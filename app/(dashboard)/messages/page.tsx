import { Suspense } from "react"
import { MessagesPageClient } from "./messages-page-client"
import { getAccessibleBotsClient, getUserBotAccess } from "@/lib/database"

interface MessagesPageProps {
  searchParams: { bot?: string; date?: string }
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  console.log("🔄 Messages Page: Server component loading...")
  console.log("🔍 Messages Page: Search params:", searchParams)

  const selectedBot = searchParams.bot || null
  const selectedDate = searchParams.date || null

  // Get user access and accessible bots (same as dashboard)
  const [userAccess, bots] = await Promise.all([getUserBotAccess(), getAccessibleBotsClient()])

  console.log("📊 Messages Page: User access:", userAccess)
  console.log("📊 Messages Page: Loaded bots:", bots.length)
  console.log("📊 Messages Page: Selected bot:", selectedBot)

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
          <span className="ml-2 text-gray-600">Loading messages...</span>
        </div>
      }
    >
      <MessagesPageClient bots={bots} selectedBot={selectedBot} selectedDate={selectedDate} userAccess={userAccess} />
    </Suspense>
  )
}
