import { Suspense } from "react"
import { MessagesPageClient } from "./messages-page-client"
import { getAccessibleBotsClient, getUserBotAccess } from "@/lib/database"
import Loading from "@/components/loading"

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
    <Suspense fallback={<Loading message="Loading messages..." />}>
      <MessagesPageClient bots={bots} selectedBot={selectedBot} selectedDate={selectedDate} userAccess={userAccess} />
    </Suspense>
  )
}
