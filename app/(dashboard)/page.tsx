"use client"

import { useState, useEffect, useCallback } from "react"
import { getThreadsSimple } from "@/lib/actions/thread.actions"
import { getBots } from "@/lib/actions/bot.actions"
import ThreadsView from "@/components/ThreadsView"
import type { Bot } from "@/types"

type DateFilter = "last7days" | "last30days" | "last90days" | "all"

const Page = () => {
  const [threads, setThreads] = useState([])
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("last30days")

  const fetchBots = useCallback(async () => {
    const bots = await getBots()
    setBots(bots)
  }, [])

  const fetchThreads = useCallback(
    async (botId: string | null) => {
      const threads = await getThreadsSimple(500, botId, dateFilter) // Increased limit and added dateFilter
      setThreads(threads)
    },
    [dateFilter],
  )

  useEffect(() => {
    fetchBots()
  }, [fetchBots])

  useEffect(() => {
    if (selectedBot) {
      fetchThreads(selectedBot)
    } else {
      fetchThreads(null)
    }
  }, [selectedBot, fetchThreads])

  const handleBotSelect = (botId: string | null) => {
    setSelectedBot(botId)
  }

  const handleRefresh = async () => {
    if (selectedBot) {
      await fetchThreads(selectedBot)
    } else {
      await fetchThreads(null)
    }
  }

  return (
    <ThreadsView
      initialThreads={threads}
      selectedBot={selectedBot}
      onRefresh={handleRefresh}
      bots={bots}
      dateFilter={dateFilter}
      onDateFilterChange={setDateFilter}
    />
  )
}

export default Page
