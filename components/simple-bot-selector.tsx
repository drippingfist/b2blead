"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
}

interface SimpleBotSelectorProps {
  selectedBot: string | null
  onSelectBot: (botShareName: string | null) => void
}

export default function SimpleBotSelector({ selectedBot, onSelectBot }: SimpleBotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const { data, error } = await supabase
          .from("bots")
          .select("id, bot_share_name, client_name")
          .order("client_name", { ascending: true })

        if (error) {
          console.error("Error fetching bots:", error)
        } else {
          console.log("Loaded bots:", data)
          setBots(data || [])
        }
      } catch (err) {
        console.error("Exception fetching bots:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBots()
  }, [])

  // Find the selected bot to show its client_name
  const selectedBotData = bots.find((bot) => bot.bot_share_name === selectedBot)
  const displayName = selectedBot === null ? "All Bots" : selectedBotData?.client_name || selectedBot

  if (loading) {
    return <div className="px-3 py-2 text-sm text-gray-500">Loading bots...</div>
  }

  return (
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
          {/* All Bots option */}
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
  )
}
