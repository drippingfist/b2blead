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
        console.log("Fetching callbacks data for bot:", selectedBot)
        const [fetchedCallbacks, fetchedStats, columnAnalysis] = await Promise.all([
          getCallbacksClient(100, selectedBot),
          getCallbackStatsClientWithPeriod(selectedBot, selectedPeriod as any),
          analyzeCallbackColumns(selectedBot),
        ])
        setCallbacks(fetchedCallbacks)
        setStats(fetchedStats)
        setColumnConfig(columnAnalysis)
      } catch (error) {
        console.error("Error fetching callback data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, selectedPeriod])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
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
