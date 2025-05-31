"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface BotContextType {
  selectedBot: string | null
  setSelectedBot: (botShareName: string | null) => void
}

const BotContext = createContext<BotContextType>({
  selectedBot: null,
  setSelectedBot: () => {},
})

export const useBotContext = () => useContext(BotContext)

export function BotProvider({ children }: { children: ReactNode }) {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)

  // Load selected bot from localStorage on mount
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot) {
      setSelectedBot(storedBot)
    }
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
      }}
    >
      {children}
    </BotContext.Provider>
  )
}
