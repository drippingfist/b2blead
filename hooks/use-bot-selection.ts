"use client"

import { useState, useEffect } from "react"

export function useBotSelection() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [isSelectionLoaded, setIsSelectionLoaded] = useState(false)

  useEffect(() => {
    // Get initial bot selection from localStorage
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    } else {
      setSelectedBot(null)
    }
    setIsSelectionLoaded(true)

    const handleBotSelectionChanged = (event: CustomEvent) => {
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  return { selectedBot, isSelectionLoaded }
}
