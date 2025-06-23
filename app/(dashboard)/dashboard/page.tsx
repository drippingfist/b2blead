"use client"
import { Suspense } from "react"
import { getCurrentUserEmailClient, getUserBotAccess } from "@/lib/database"
import DashboardClient from "./dashboard-client"
import Loading from "@/components/loading"

// This is now the data-fetching layer
export default async function DashboardPage() {
  const [userAccess, userEmail] = await Promise.all([getUserBotAccess(), getCurrentUserEmailClient()])

  // Pass user access and email down to the client component.
  // The client component will handle fetching metrics based on bot selection changes.
  return (
    <Suspense fallback={<Loading message="Loading dashboard..." />}>
      <DashboardClient userAccess={userAccess} userEmail={userEmail} />
    </Suspense>
  )
}
