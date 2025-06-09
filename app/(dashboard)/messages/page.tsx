import { Suspense } from "react"
import { MessagesPageClient } from "./messages-page-client"
import { getAccessibleBotsClient } from "@/lib/database"

export default async function MessagesPage() {
  const bots = await getAccessibleBotsClient()

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
          <span className="ml-2 text-gray-600">Loading messages...</span>
        </div>
      }
    >
      <MessagesPageClient bots={bots} />
    </Suspense>
  )
}
