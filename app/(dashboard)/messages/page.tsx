import { Suspense } from "react"
import { MessagesPageClient } from "./messages-page-client"
import { getAccessibleBotsClient } from "@/lib/database"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { bot?: string; date?: string }
}) {
  const selectedBot = searchParams.bot || null
  const selectedDate = searchParams.date || null
  const bots = await getAccessibleBotsClient()

  // Get the first 10 threads with their messages for the selected bot
  const threadsWithMessages = await getRecentThreadsWithMessages(selectedBot, 10, 0, selectedDate)

  return (
    <Suspense fallback={<div>Loading messages...</div>}>
      <MessagesPageClient
        threadsWithMessages={threadsWithMessages}
        bots={bots}
        selectedBot={selectedBot}
        selectedDate={selectedDate}
      />
    </Suspense>
  )
}
