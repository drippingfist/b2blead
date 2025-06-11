import { Suspense } from "react"
import { getAccessibleBotsClient } from "@/lib/database"
import ChatsPageClient from "./chats-page-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ChatsPage() {
  // Get all accessible bots for the current user
  const bots = await getAccessibleBotsClient()

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading chats...</div>}>
        <ChatsPageClient bots={bots} />
      </Suspense>
    </div>
  )
}
