"use client"

import { useEffect, useState } from "react"
import { useBotContext } from "@/contexts/bot-context"
import { getCallbacksClient, getCallbackStatsClient } from "@/lib/database"
import CallbacksView from "@/components/callbacks-view"

export default function CallbacksPage() {
  const { selectedBot, isLoading: botContextLoading } = useBotContext()
  const [callbacks, setCallbacks] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ totalCallbacks: 0, recentCallbacks: 0, topCountries: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (botContextLoading) return // Wait for bot context to load

      setLoading(true)
      try {
        const [fetchedCallbacks, fetchedStats] = await Promise.all([
          getCallbacksClient(100, selectedBot),
          getCallbackStatsClient(selectedBot),
        ])
        setCallbacks(fetchedCallbacks)
        setStats(fetchedStats)
      } catch (error) {
        console.error("Error fetching callback data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, botContextLoading])

  if (botContextLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  return <CallbacksView initialCallbacks={callbacks} stats={stats} />
}
