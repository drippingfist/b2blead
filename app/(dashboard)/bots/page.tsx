"use client"

import { useEffect, useState } from "react"
import { getBotsClient, getCurrentUserEmailClient } from "@/lib/database"

export default function BotsPage() {
  const [bots, setBots] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const fetchedUserEmail = await getCurrentUserEmailClient()
        setUserEmail(fetchedUserEmail)

        const fetchedBots = await getBotsClient()
        setBots(fetchedBots)
      } catch (error) {
        console.error("Error fetching bots data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Bot Management</h1>
          <p className="text-[#616161]">View and manage all available bots.</p>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#212121]">
                {bot.client_name || bot.bot_share_name || "Unnamed Bot"}
              </h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  bot.LIVE ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {bot.LIVE ? "Live" : "Inactive"}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[#616161]">Share Name: </span>
                <span className="text-[#212121] font-mono text-xs">{bot.bot_share_name || "Not set"}</span>
              </div>
              <div>
                <span className="text-[#616161]">Email: </span>
                <span className="text-[#212121]">{bot.client_email || "Not set"}</span>
              </div>
              <div>
                <span className="text-[#616161]">Model: </span>
                <span className="text-[#212121]">{bot.groq_model || "Not set"}</span>
              </div>
              <div>
                <span className="text-[#616161]">Timezone: </span>
                <span className="text-[#212121]">{bot.timezone || "Not set"}</span>
              </div>
            </div>

            {bot.client_description && (
              <div className="mt-4">
                <p className="text-sm text-[#616161]">{bot.client_description}</p>
              </div>
            )}

            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-[#038a71] hover:bg-[#038a71]/90 text-white px-3 py-2 rounded-md text-sm">
                View Threads
              </button>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#616161]">No bots found in the database.</p>
        </div>
      )}
    </div>
  )
}
