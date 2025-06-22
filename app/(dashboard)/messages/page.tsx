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

  // Check if user has admin role or is superadmin
  if (userAccess.role !== "admin" && userAccess.role !== "superadmin" && !userAccess.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Your current role: {userAccess.role || "none"}</p>
        </div>
      </div>
    )
  }

  console.log("📊 Messages Page: User access:", userAccess)
  console.log("📊 Messages Page: Loaded bots:", bots.length)
  console.log("📊 Messages Page: Selected bot:", selectedBot)

  return (
    <Suspense fallback={<Loading message="Loading messages..." />}>
      <MessagesPageClient bots={bots} selectedBot={selectedBot} selectedDate={selectedDate} userAccess={userAccess} />
    </Suspense>
  )
}
