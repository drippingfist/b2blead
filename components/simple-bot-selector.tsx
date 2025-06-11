"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check, Search, X } from "lucide-react"
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
  const [filteredBots, setFilteredBots] = useState<Bot[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
        setFilteredBots(accessibleBots)

        // Store bots in localStorage for other components
        localStorage.setItem("userBots", JSON.stringify(accessibleBots))

        // Emit event so other components know bots are loaded
        window.dispatchEvent(new CustomEvent("botsLoaded", { detail: accessibleBots }))

        // If user has bots but no selection, auto-select the first one
        // For superadmins, don't auto-select - let them choose "All Bots" or a specific bot
        if (accessibleBots.length > 0 && !selectedBot && !access.isSuperAdmin) {
          const firstBot = accessibleBots[0]
          onSelectBot(firstBot.bot_share_name)
        }
      } catch (err) {
        console.error("❌ Exception fetching user access and bots:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAccessAndBots()
  }, [])

  // Filter bots based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredBots(bots)
    } else {
      const filtered = bots.filter(
        (bot) =>
          bot.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bot.bot_share_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredBots(filtered)
    }
  }, [searchTerm, bots])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Find the selected bot to show its client_name
  const selectedBotData = bots.find((bot) => bot.bot_share_name === selectedBot)

  // Display logic for the selector button
  let displayName = "No bots available"
  if (selectedBot === null && userAccess.isSuperAdmin) {
    displayName = "All Bots"
  } else if (selectedBotData) {
    displayName = selectedBotData.client_name
  } else if (bots.length > 0) {
    displayName = bots[0].client_name
  }

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

  const handleSelectBot = (botShareName: string | null) => {
    onSelectBot(botShareName)
    setIsOpen(false)
    setSearchTerm("")
  }

  return (
    <div>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden flex flex-col">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-auto max-h-64">
              {/* Show "All Bots" option only for superadmins */}
              {userAccess.isSuperAdmin && searchTerm.trim() === "" && (
                <button
                  onClick={() => handleSelectBot(null)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                    selectedBot === null ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <span className="truncate font-medium">All Bots</span>
                  {selectedBot === null && <Check className="h-4 w-4" />}
                </button>
              )}

              {/* Individual bots - show client_name, select by bot_share_name */}
              {filteredBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => handleSelectBot(bot.bot_share_name)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                    bot.bot_share_name === selectedBot ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <span className="truncate">{bot.client_name}</span>
                  {bot.bot_share_name === selectedBot && <Check className="h-4 w-4" />}
                </button>
              ))}

              {/* No results message */}
              {filteredBots.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">No bots found matching "{searchTerm}"</div>
              )}
            </div>
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
