"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getBotsClient } from "@/lib/database"
import type { Bot } from "@/lib/database"

interface BotContextType {
  selectedBot: string | null
  setSelectedBot: (botShareName: string | null) => void
  userBots: Bot[]
  isLoading: boolean
  refreshBots: () => Promise<void> // Add this to the interface
}

const BotContext = createContext<BotContextType>({
  selectedBot: null,
  setSelectedBot: () => {},
  userBots: [],
  isLoading: false,
  refreshBots: async () => {}, // Add this to the default value
})

export const useBotContext = () => useContext(BotContext)

// Add a function to manually refresh bots
export function BotProvider({ children }: { children: ReactNode }) {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [userBots, setUserBots] = useState<Bot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Function to load bots that can be called manually
  const loadBots = async () => {
    setIsLoading(true)
    try {
      console.log("BotContext: Starting to load bots...")
      // Get all bots the user has access to
      const bots = await getBotsClient()
      console.log("BotContext: Loaded bots:", bots)
      setUserBots(bots)

      // Get stored selected bot from localStorage if available
      const storedBot = localStorage.getItem("selectedBot")
      console.log("BotContext: Stored bot from localStorage:", storedBot)
      if (storedBot && bots.some((bot) => bot.bot_share_name === storedBot)) {
        setSelectedBot(storedBot)
        console.log("BotContext: Set selected bot to:", storedBot)
      }
    } catch (error) {
      console.error("BotContext: Error loading bots:", error)
    } finally {
      setIsLoading(false)
      console.log("BotContext: Finished loading bots")
    }
  }

  // Load bots on initial render
  useEffect(() => {
    loadBots()
  }, [])

  // Save selected bot to localStorage when it changes
  useEffect(() => {
    if (selectedBot) {
      localStorage.setItem("selectedBot", selectedBot)
    } else {
      localStorage.removeItem("selectedBot")
    }
  }, [selectedBot])

  return (
    <BotContext.Provider
      value={{
        selectedBot,
        setSelectedBot,
        userBots,
        isLoading,
        refreshBots: loadBots, // Add this function to the context
      }}
    >
      {children}
    </BotContext.Provider>
  )
}
