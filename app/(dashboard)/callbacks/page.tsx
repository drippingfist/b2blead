"use client"

import { useEffect, useState } from "react"
import { getCallbacksClient, getCallbackStatsClient } from "@/lib/database"
import CallbacksView from "@/components/callbacks-view"

export default function CallbacksPage() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [callbacks, setCallbacks] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ totalCallbacks: 0, recentCallbacks: 0, topCountries: [] })
  const [loading, setLoading] = useState(true)

  // Load selected bot from localStorage
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }
  }, [])

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
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
  }, [selectedBot])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  return <CallbacksView initialCallbacks={callbacks} stats={stats} />
}
