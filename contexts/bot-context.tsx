"use client"

import { createContext, useContext, type ReactNode } from "react"

interface BotContextType {
  selectedBot: string | null
  setSelectedBot: (botShareName: string | null) => void
  userBots: any[]
  isLoading: boolean
}

const BotContext = createContext<BotContextType>({
  selectedBot: null,
  setSelectedBot: () => {},
  userBots: [],
  isLoading: false,
})

export const useBotContext = () => useContext(BotContext)

export function BotProvider({ children }: { children: ReactNode }) {
  return (
    <BotContext.Provider
      value={{
        selectedBot: null,
        setSelectedBot: () => {},
        userBots: [],
        isLoading: false,
      }}
    >
      {children}
    </BotContext.Provider>
  )
}
