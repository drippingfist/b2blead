"use client"

import { useEffect, useState } from "react"
import { getCallbacksClient, getCallbackStatsClientWithPeriod, analyzeCallbackColumns } from "@/lib/database"
import CallbacksView from "@/components/callbacks-view"
import Loading from "@/components/loading"

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
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const [fetchedCallbacks, fetchedStats, columnAnalysis] = await Promise.all([
          getCallbacksClient(100, selectedBot, selectedPeriod as any),
          getCallbackStatsClientWithPeriod(selectedBot, selectedPeriod as any),
          analyzeCallbackColumns(selectedBot),
        ])

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
    return <Loading message="Loading callbacks..." />
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
