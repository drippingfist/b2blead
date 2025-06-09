"use client"

import { useEffect, useState } from "react"
import { getCallbacksClient, getCallbackStatsClientWithPeriod, analyzeCallbackColumns } from "@/lib/database"
import CallbacksView from "@/components/callbacks-view"

export default function CallbacksPage() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last30days")
  const [callbacks, setCallbacks] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    totalCallbacks: 0,
    recentCallbacks: 0,
    callbacksDropped: 0,
    conversionRate: 0,
    totalThreads: 0,
  })
  const [columnConfig, setColumnConfig] = useState({
    hasCompany: false,
    hasCountry: false,
    hasUrl: false,
    hasPhone: false,
    hasRevenue: false,
  })
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Load selected bot from localStorage on initial page load
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    console.log("📋 Callbacks Page: Initial load - stored bot:", storedBot)

    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    } else {
      setSelectedBot(null) // This will show all bots for superadmin
    }
    setInitialLoadComplete(true)
  }, [])

  // Listen for bot selection changes from bot selector
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      const newBot = event.detail
      console.log("📋 Callbacks Page: Bot selection changed to:", newBot)
      setSelectedBot(newBot)

      // Update localStorage
      if (newBot) {
        localStorage.setItem("selectedBot", newBot)
      } else {
        localStorage.removeItem("selectedBot")
      }
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  // Fetch data whenever selectedBot or selectedPeriod changes, but only after initial load
  useEffect(() => {
    if (!initialLoadComplete) {
      console.log("📋 Callbacks Page: Waiting for initial load to complete...")
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        console.log("📋 Callbacks Page: Fetching data for bot:", selectedBot, "period:", selectedPeriod)

        const [fetchedCallbacks, fetchedStats, columnAnalysis] = await Promise.all([
          getCallbacksClient(100, selectedBot),
          getCallbackStatsClientWithPeriod(selectedBot, selectedPeriod as any),
          analyzeCallbackColumns(selectedBot),
        ])

        console.log("📋 Callbacks Page: Fetched", fetchedCallbacks.length, "callbacks for bot:", selectedBot)

        setCallbacks(fetchedCallbacks)
        setStats(fetchedStats)
        setColumnConfig(columnAnalysis)
      } catch (error) {
        console.error("❌ Callbacks Page: Error fetching callback data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, selectedPeriod, initialLoadComplete])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
        <span className="ml-2 text-gray-600">Loading callbacks...</span>
      </div>
    )
  }

  return (
    <CallbacksView
      initialCallbacks={callbacks}
      stats={stats}
      columnConfig={columnConfig}
      onPeriodChange={handlePeriodChange}
      selectedPeriod={selectedPeriod}
    />
  )
}
