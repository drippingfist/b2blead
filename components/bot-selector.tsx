"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Bot {
  id: string
  client_name: string
  bot_share_name: string
}

interface BotSelectorProps {
  selectedBot: string | null
  onSelectBot: (botShareName: string | null) => void
}

export default function BotSelector({ selectedBot, onSelectBot }: BotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load ALL bots from database
  useEffect(() => {
    const loadBots = async () => {
      try {
        const { data, error, count } = await supabase
          .from("bots")
          .select("id, bot_share_name, client_name", { count: "exact" })
          .order("client_name", { ascending: true })

        if (error) {
          console.error("❌ Error loading bots:", error)
          setError(`Database error: ${error.message}`)
          return
        }

        setBots(data || [])

        // Auto-select the single bot if there's only one and nothing is selected
        if (data && data.length === 1) {
          const storedBot = localStorage.getItem("selectedBot")
          if (!storedBot || storedBot === "null") {
            localStorage.setItem("selectedBot", data[0].bot_share_name)
            // Dispatch event without page refresh
            window.dispatchEvent(new CustomEvent("botSelectionChanged", { detail: data[0].bot_share_name }))
            // Call the onSelectBot prop if provided
            if (onSelectBot) {
              onSelectBot(data[0].bot_share_name)
            }
          }
        }
      } catch (error: any) {
        console.error("❌ Exception loading bots:", error)
        setError(`Exception: ${error.message}`)
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

  // Find the currently selected bot
  const currentBot = bots.find((bot) => bot.bot_share_name === selectedBot)
  const displayName = selectedBot === null ? "All Bots" : currentBot?.client_name || "Select Bot"

  const handleBotSelection = (botShareName: string | null) => {
    // Store current sidebar state before refresh
    const sidebarElement = document.getElementById("mobile-sidebar")
    const isSidebarOpen = sidebarElement && !sidebarElement.classList.contains("-translate-x-full")

    if (isSidebarOpen) {
      localStorage.setItem("sidebarWasOpen", "true")
    } else {
      localStorage.removeItem("sidebarWasOpen")
    }

    // Update localStorage immediately
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

  if (loading) {
    return (
      <div className="w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-gray-50 text-[#616161]">
        Loading bots...
      </div>
    )
  }

  // If only one bot, show simple display instead of dropdown
  if (bots.length === 1) {
    const singleBot = bots[0]
    return (
      <div className="space-y-2">
        <div className="w-full px-3 py-2 text-sm font-medium bg-gray-50 border border-[#e0e0e0] rounded-md text-[#212121]">
          {singleBot.client_name}
        </div>
        <div className="text-xs text-gray-500">
          <div>Found: 1 bot</div>
          <div>Selected: {singleBot.client_name}</div>
        </div>
      </div>
    )
  }

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

            {/* Individual bot options - showing client_name */}
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

            {bots.length === 0 && (
              <div className="px-3 py-2 text-sm text-[#616161]">{error ? `Error: ${error}` : "No bots found"}</div>
            )}
          </div>
        )}
      </div>

      {/* Debug info */}
      <div className="text-xs text-gray-500">
        <div>Found: {bots.length} bots</div>
        <div>Selected: {selectedBot ? currentBot?.client_name : "All Bots"}</div>
        {error && <div className="text-red-500">Error: {error}</div>}
      </div>
    </div>
  )
}
