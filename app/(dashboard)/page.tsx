"use client"

import { useState, useEffect, useCallback } from "react"
import { getThreadsSimple } from "@/lib/actions/thread.actions"
import { getBots } from "@/lib/actions/bot.actions"
import ThreadsView from "@/components/ThreadsView"
import type { Bot } from "@/types"

type DateFilter = "today" | "last7days" | "last30days" | "last90days" | "alltime"

const Page = () => {
  const [threads, setThreads] = useState([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("last30days")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBots = useCallback(async () => {
    const bots = await getBots()
    setBots(bots)
  }, [])

  const fetchThreads = useCallback(
    async (filter: DateFilter = dateFilter) => {
      setLoading(true)
      setError(null)
      try {
        console.log("🧵 PAGE: Fetching threads for bot_share_name:", selectedBot, "with filter:", filter)
        const threadsData = await getThreadsSimple(100, selectedBot, filter)
        console.log(`🧵 PAGE: Fetched ${threadsData.length} threads`)
        setThreads(threadsData)
      } catch (error: any) {
        console.error("❌ PAGE: Error fetching threads:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    },
    [selectedBot, setThreads, setLoading, setError],
  )

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  useEffect(() => {
    if (selectedBot) {
      fetchThreads()
    } else {
      fetchThreads()
    }
  }, [selectedBot, fetchThreads])

  useEffect(() => {
    fetchThreads()
  }, [dateFilter, fetchThreads])

  const handleBotSelect = (botId: string | null) => {
    setSelectedBot(botId)
  }

  const handleRefresh = async () => {
    fetchThreads()
  }

  const handleDateFilterChange = (newFilter: DateFilter) => {
    setDateFilter(newFilter)
    fetchThreads(newFilter)
  }

  return (
    <ThreadsView
      initialThreads={threads}
      selectedBot={selectedBot}
      onRefresh={() => fetchThreads()}
      bots={bots}
      dateFilter={dateFilter}
      onDateFilterChange={handleDateFilterChange}
    />
  )
}

export default Page
