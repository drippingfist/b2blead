"use client"

import { useEffect, useState } from "react"
import { getThreadStatsClient, getBotsClient, getCallbackStatsClient, getCurrentUserEmailClient } from "@/lib/database"

export default function Dashboard() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [threadStats, setThreadStats] = useState<any>({
    totalThreads: 0,
    recentThreads: 0,
    callbackRequests: 0,
    avgSentiment: 0,
  })
  const [callbackStats, setCallbackStats] = useState<any>({ totalCallbacks: 0, recentCallbacks: 0, topCountries: [] })
  const [bots, setBots] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
        const [fetchedThreadStats, fetchedCallbackStats, fetchedBots, fetchedUserEmail] = await Promise.all([
          getThreadStatsClient(selectedBot),
          getCallbackStatsClient(selectedBot),
          getBotsClient(),
          getCurrentUserEmailClient(),
        ])

        setThreadStats(fetchedThreadStats)
        setCallbackStats(fetchedCallbackStats)
        setBots(fetchedBots)
        setUserEmail(fetchedUserEmail)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot])

  const liveBots = bots.filter((bot) => bot.LIVE === true)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Dashboard</h1>
        <p className="text-[#616161]">
          Welcome back, {userEmail}. You have access to {bots.length} bot(s).
        </p>
        {selectedBot && (
          <p className="text-sm text-[#038a71] mt-1">
            Currently viewing: {bots.find((b) => b.bot_share_name === selectedBot)?.client_name || selectedBot}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Total Conversations</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{threadStats.totalThreads}</p>
          <p className="text-sm text-[#616161] mt-1">{selectedBot ? "Selected bot" : "All bots"}</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Callback Requests</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{callbackStats.totalCallbacks}</p>
          <p className="text-sm text-[#616161] mt-1">Total requests</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Available Bots</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{bots.length}</p>
          <p className="text-sm text-[#616161] mt-1">{liveBots.length} live</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Recent Activity</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{callbackStats.recentCallbacks}</p>
          <p className="text-sm text-[#616161] mt-1">Last 7 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h3 className="text-lg font-medium text-[#212121] mb-4">Available Bots</h3>
          <div className="space-y-3">
            {bots.slice(0, 5).map((bot) => (
              <div key={bot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium text-[#212121]">{bot.client_name || bot.bot_share_name || "Unnamed Bot"}</p>
                  <p className="text-sm text-[#616161]">{bot.client_email}</p>
                </div>
                <div className="flex items-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      bot.LIVE ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {bot.LIVE ? "Live" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
            {bots.length === 0 && <p className="text-[#616161] text-center py-4">No bots found in the database</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h3 className="text-lg font-medium text-[#212121] mb-4">Top Countries</h3>
          <div className="space-y-3">
            {callbackStats.topCountries.slice(0, 5).map(([country, count]) => (
              <div key={country} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium text-[#212121]">{country}</p>
                  <p className="text-sm text-[#616161]">Callback requests</p>
                </div>
                <div className="text-[#038a71] font-bold">{count}</div>
              </div>
            ))}
            {callbackStats.topCountries.length === 0 && (
              <p className="text-[#616161] text-center py-4">No callback data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
