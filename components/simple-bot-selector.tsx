"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Bot {
  id: string
  bot_share_name: string
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
            .select("id, bot_share_name")
            .order("bot_share_name", { ascending: true })

          if (error) throw error
          botsData = data || []
        } else if (accessibleBots.length > 0) {
          // Regular users only see their accessible bots
          const { data, error } = await supabase
            .from("bots")
            .select("id, bot_share_name")
            .in("bot_share_name", accessibleBots)
            .order("bot_share_name", { ascending: true })

          if (error) throw error
          botsData = data || []
        }

        setBots(botsData)
      } catch (error: any) {
        console.error("Failed to load bots:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadBots()
  }, [])

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
    // Store current sidebar state before refresh
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

    // GUARANTEED FORCE REFRESH - Multiple approaches for maximum reliability
    console.log("🔄 FORCING PAGE REFRESH...")

    // Approach 1: window.location.reload()
    window.location.reload()

    // Approach 2: Form submission (backup if reload is prevented)
    // This will only execute if reload is somehow prevented
    setTimeout(() => {
      try {
        const form = document.createElement("form")
        form.method = "GET"
        form.action = window.location.href
        document.body.appendChild(form)
        form.submit()
        console.log("🔄 Form submission refresh triggered")
      } catch (e) {
        console.error("Form submission failed, trying direct location assign")
        window.location.href = window.location.href
      }
    }, 100)
  }

  // Find the currently selected bot
  const currentBot = bots.find((bot) => bot.bot_share_name === selectedBot)
  const displayName = selectedBot === null ? "All Bots" : currentBot?.bot_share_name || "Select Bot"

  if (loading) {
    return (
      <div
        className={`w-full px-3 py-2 text-sm border border-[#e0e0e0] rounded-md bg-gray-50 text-[#616161] ${className}`}
      >
        Loading...
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
              <span className="truncate">{bot.bot_share_name}</span>
              {bot.bot_share_name === selectedBot && <Check className="h-4 w-4 text-[#038a71]" />}
            </button>
          ))}

          {bots.length === 0 && <div className="px-3 py-2 text-sm text-[#616161]">No bots available</div>}
        </div>
      )}
    </div>
  )
}
