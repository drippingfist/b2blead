"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { getUserBotAccess } from "@/lib/database"

interface Bot {
  id: string
  bot_share_name: string
  client_name?: string
}

interface SimpleBotSelectorProps {
  selectedBot: string | null
  onSelectBot: (botShareName: string | null) => void
}

export default function SimpleBotSelector({ selectedBot, onSelectBot }: SimpleBotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })

  // Load accessible bots for the current user
  useEffect(() => {
    const loadBots = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("🔍 Loading accessible bots for current user...")

        // First get user access to determine which bots they can see
        const access = await getUserBotAccess()
        setUserAccess(access)
        console.log("🔐 User access:", access)

        if (!access.role) {
          console.log("❌ No role assigned to user")
          setError("No bot access assigned")
          setBots([])
          return
        }

        let botsData: Bot[] = []

        if (access.isSuperAdmin) {
          console.log("🔐 User is superadmin - fetching ALL bots")
          // Superadmin gets all bots
          const { data, error: botsError } = await supabase
            .from("bots")
            .select("id, bot_share_name, client_name")
            .not("bot_share_name", "is", null)
            .order("client_name", { ascending: true })

          if (botsError) {
            console.error("❌ Error loading all bots for superadmin:", botsError)
            setError(`Database error: ${botsError.message}`)
            return
          }

          botsData = data || []
          console.log(`✅ Superadmin loaded ${botsData.length} bots:`, botsData)
        } else {
          // Regular user - get their specific bot assignments
          if (access.accessibleBots.length === 0) {
            console.log("❌ No accessible bots for user")
            setError("No bot access assigned")
            setBots([])
            return
          }

          console.log("🔐 Regular user - fetching assigned bots:", access.accessibleBots)
          const { data, error: botsError } = await supabase
            .from("bots")
            .select("id, bot_share_name, client_name")
            .in("bot_share_name", access.accessibleBots)
            .order("client_name", { ascending: true })

          if (botsError) {
            console.error("❌ Error loading assigned bots:", botsError)
            setError(`Database error: ${botsError.message}`)
            return
          }

          botsData = data || []
          console.log(`✅ Regular user loaded ${botsData.length} assigned bots:`, botsData)
        }

        setBots(botsData)

        // Auto-select first bot if no selection and user has bots
        if (botsData.length > 0 && !selectedBot) {
          const firstBot = botsData[0]
          console.log("🤖 Auto-selecting first bot:", firstBot.client_name || firstBot.bot_share_name)
          onSelectBot(firstBot.bot_share_name)
        }
      } catch (error: any) {
        console.error("❌ Exception loading bots:", error)
        setError(`Exception: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadBots()
  }, [selectedBot, onSelectBot])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Find the currently selected bot
  const currentBot = bots.find((bot) => bot.bot_share_name === selectedBot)

  // Use client_name if available, otherwise fall back to bot_share_name
  const displayName = currentBot ? currentBot.client_name || currentBot.bot_share_name : "Select Bot"

  if (loading) {
    return (
      <div className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-gray-50 text-[#616161]">
        Loading bots...
      </div>
    )
  }

  if (error && bots.length === 0) {
    return (
      <div className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-red-50 text-red-500">{error}</div>
    )
  }

  // If user has only one bot and is not superadmin, show static display (no dropdown)
  if (bots.length === 1 && !userAccess.isSuperAdmin) {
    const singleBot = bots[0]
    return (
      <div className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-gray-50 text-[#212121] font-medium">
        {singleBot.client_name || singleBot.bot_share_name}
      </div>
    )
  }

  // Show dropdown for multiple bots or superadmin
  return (
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-white border border-[#e0e0e0] rounded-md hover:bg-gray-50"
        >
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
        </button>

        {isOpen && (
          <div className="absolute z-[9999] mt-1 w-full bg-white border border-[#e0e0e0] rounded-md shadow-lg max-h-60 overflow-auto">
            {/* All Bots option for superadmin */}
            {userAccess.isSuperAdmin && (
              <button
                onClick={() => {
                  console.log("🤖 Selected: All Bots")
                  onSelectBot(null)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  selectedBot === null ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                }`}
              >
                <span className="truncate">All Bots</span>
                {selectedBot === null && <Check className="h-4 w-4 text-[#038a71]" />}
              </button>
            )}

            {/* Individual bot options - showing client_name if available, otherwise bot_share_name */}
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => {
                  console.log("🤖 Selected bot:", bot.client_name || bot.bot_share_name)
                  onSelectBot(bot.bot_share_name)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  bot.bot_share_name === selectedBot ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
                }`}
              >
                <span className="truncate">{bot.client_name || bot.bot_share_name}</span>
                {bot.bot_share_name === selectedBot && <Check className="h-4 w-4 text-[#038a71]" />}
              </button>
            ))}

            {bots.length === 0 && <div className="px-3 py-2 text-sm text-[#616161]">No bots available</div>}
          </div>
        )}
      </div>

      {/* Debug info - only show in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-500">
          <div>Role: {userAccess.role || "none"}</div>
          <div>Bots: {bots.length}</div>
          <div>Selected: {selectedBot || "All Bots"}</div>
          {userAccess.isSuperAdmin && <div className="text-green-600">SuperAdmin Access</div>}
          {error && <div className="text-red-500">Error: {error}</div>}
        </div>
      )}
    </div>
  )
}
