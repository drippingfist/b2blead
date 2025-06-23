"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
}

interface SimpleBotSelectorProps {
  selectedBot: string | null
  onSelectBot?: (botShareName: string | null) => void
  className?: string
}

export default function SimpleBotSelector({ selectedBot, onSelectBot, className = "" }: SimpleBotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load accessible bots for current user
  useEffect(() => {
    const loadBots = async () => {
      try {
        // Get user's accessible bots
        const { getUserBotAccess } = await import("@/lib/database")
        const { accessibleBots, isSuperAdmin } = await getUserBotAccess()

        let botsData: Bot[] = []

        if (isSuperAdmin) {
          // Super admins can see all bots
          const { data, error } = await supabase
            .from("bots")
            .select("id, bot_share_name, client_name")
            .order("client_name", { ascending: true })

          if (error) throw error
          botsData = data || []
        } else if (accessibleBots.length > 0) {
          // Regular users only see their accessible bots
          const { data, error } = await supabase
            .from("bots")
            .select("id, bot_share_name, client_name")
            .in("bot_share_name", accessibleBots)
            .order("client_name", { ascending: true })

          if (error) throw error
          botsData = data || []
        }

        setBots(botsData)

        // Auto-select the single bot if there's only one and nothing is selected
        if (botsData.length === 1) {
          const storedBot = localStorage.getItem("selectedBot")
          if (!storedBot || storedBot === "null") {
            localStorage.setItem("selectedBot", botsData[0].bot_share_name)
            // Dispatch event without page refresh
            window.dispatchEvent(new CustomEvent("botSelectionChanged", { detail: botsData[0].bot_share_name }))
            // Call the onSelectBot prop if provided
            if (onSelectBot) {
              onSelectBot(botsData[0].bot_share_name)
            }
          }
        }
      } catch (error: any) {
        console.error("Failed to load bots:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadBots()
  }, [onSelectBot])

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

  const handleBotSelection = (botShareName: string | null) => {
    // Store current sidebar state
    const sidebarElement = document.getElementById("mobile-sidebar")
    const isSidebarOpen = sidebarElement && !sidebarElement.classList.contains("-translate-x-full")

    if (isSidebarOpen) {
      localStorage.setItem("sidebarWasOpen", "true")
      console.log("💾 Sidebar was open, storing state")
    } else {
      localStorage.removeItem("sidebarWasOpen")
      console.log("💾 Sidebar was closed, removing state")
    }

    // Update localStorage
    if (botShareName) {
      localStorage.setItem("selectedBot", botShareName)
    } else {
      localStorage.removeItem("selectedBot")
    }

    // Call the onSelectBot prop if provided
    if (onSelectBot) {
      onSelectBot(botShareName)
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent("botSelectionChanged", { detail: botShareName }))
  }

  // Find the currently selected bot
  const currentBot = bots.find((bot) => bot.bot_share_name === selectedBot)
  const displayName = selectedBot === null ? "All Bots" : currentBot?.client_name || "Select Bot"

  if (loading) {
    return (
      <div
        className={`w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-gray-50 text-[#616161] ${className}`}
      >
        Loading...
      </div>
    )
  }

  // If only one bot, show simple display instead of dropdown
  if (bots.length === 1) {
    const singleBot = bots[0]
    return (
      <div
        className={`w-full px-3 py-2 text-sm font-medium bg-gray-50 border border-[#e0e0e0] rounded-md text-[#212121] ${className}`}
      >
        {singleBot.client_name}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-white border border-[#e0e0e0] rounded-md hover:bg-gray-50"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full bg-white border border-[#e0e0e0] rounded-md shadow-lg max-h-60 overflow-auto">
          {/* All Bots option */}
          <button
            onClick={() => {
              handleBotSelection(null)
              setIsOpen(false)
            }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
              selectedBot === null ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
            }`}
          >
            <span className="truncate">All Bots</span>
            {selectedBot === null && <Check className="h-4 w-4 text-[#038a71]" />}
          </button>

          {/* Individual bot options */}
          {bots.map((bot) => (
            <button
              key={bot.id}
              onClick={() => {
                handleBotSelection(bot.bot_share_name)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                bot.bot_share_name === selectedBot ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#212121]"
              }`}
            >
              <span className="truncate">{bot.client_name}</span>
              {bot.bot_share_name === selectedBot && <Check className="h-4 w-4 text-[#038a71]" />}
            </button>
          ))}

          {bots.length === 0 && <div className="px-3 py-2 text-sm text-[#616161]">No bots available</div>}
        </div>
      )}
    </div>
  )
}
