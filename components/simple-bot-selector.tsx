"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { getUserBotAccess, getAccessibleBotsClient } from "@/lib/database"

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
}

interface SimpleBotSelectorProps {
  selectedBot: string | null
  onSelectBot: (botShareName: string | null) => void
}

// Update the component to handle member role and hide for single bot users
export default function SimpleBotSelector({ selectedBot, onSelectBot }: SimpleBotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })

  useEffect(() => {
    const fetchUserAccessAndBots = async () => {
      try {
        console.log("🔐 Fetching user access and bots...")

        // Get user's access level and accessible bots
        const access = await getUserBotAccess()
        console.log("🔐 User access:", access)
        setUserAccess(access)

        // Get the actual bot records the user has access to
        const accessibleBots = await getAccessibleBotsClient()
        console.log("🤖 Accessible bots:", accessibleBots)
        setBots(accessibleBots)

        // If user has only one bot, auto-select it and don't show selector
        if (accessibleBots.length === 1 && !access.isSuperAdmin) {
          const singleBot = accessibleBots[0]
          if (selectedBot !== singleBot.bot_share_name) {
            onSelectBot(singleBot.bot_share_name)
          }
        }
      } catch (err) {
        console.error("❌ Exception fetching user access and bots:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAccessAndBots()
  }, [])

  // Find the selected bot to show its client_name
  const selectedBotData = bots.find((bot) => bot.bot_share_name === selectedBot)
  const displayName = selectedBot === null ? "All Bots" : selectedBotData?.client_name || selectedBot

  if (loading) {
    return <div className="px-3 py-2 text-sm text-gray-500">Loading bots...</div>
  }

  // If user has no access, show message
  if (!userAccess.role || bots.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
        No bot access assigned
      </div>
    )
  }

  // Hide selector if user has only one bot (unless they're superadmin)
  if (bots.length === 1 && !userAccess.isSuperAdmin) {
    return (
      <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md">
        <span className="font-medium">{bots[0].client_name}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {/* All Bots option - only show for superadmin */}
            {userAccess.isSuperAdmin && (
              <button
                onClick={() => {
                  onSelectBot(null)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  selectedBot === null ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <span>All Bots</span>
                {selectedBot === null && <Check className="h-4 w-4" />}
              </button>
            )}

            {/* Individual bots - show client_name, select by bot_share_name */}
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => {
                  onSelectBot(bot.bot_share_name)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  bot.bot_share_name === selectedBot ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <span className="truncate">{bot.client_name}</span>
                {bot.bot_share_name === selectedBot && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hide debug info for single bot users */}
      {(bots.length > 1 || userAccess.isSuperAdmin) && (
        <div className="text-xs text-gray-500 mt-1">
          <div>Role: {userAccess.role || "none"}</div>
          <div>Bots: {bots.length}</div>
          {userAccess.isSuperAdmin && <div className="text-green-600">SuperAdmin Access</div>}
        </div>
      )}
    </div>
  )
}
