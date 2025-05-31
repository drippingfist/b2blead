"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"

interface BotData {
  bot_share_name: string
  client_name?: string
}

interface BotSelectorProps {
  bots: BotData[]
  selectedBot: string | null
  onSelectBot: (botShareName: string | null) => void
}

export default function BotSelector({ bots, selectedBot, onSelectBot }: BotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
  const displayName =
    selectedBot === null ? "All Bots" : currentBot?.client_name || currentBot?.bot_share_name || "Select Bot"

  return (
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

          {/* Individual bot options */}
          {bots.map((bot) => (
            <button
              key={bot.bot_share_name}
              onClick={() => {
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
        </div>
      )}
    </div>
  )
}
