"use client"

import { useState, useEffect } from "react"
import type { ThreadWithMessageCount } from "@/types"
import type { Bot } from "@/types"
import ThreadItem from "./thread-item"
import { useSearchParams, useRouter } from "next/navigation"
import type { DateFilter } from "@/types"
import { Dropdown } from "./dropdown"

interface ThreadsViewProps {
  initialThreads: ThreadWithMessageCount[]
  selectedBot: string | null
  onRefresh: () => void
  bots: Bot[]
  dateFilter?: DateFilter
  onDateFilterChange?: (filter: DateFilter) => void
}

export default function ThreadsView({
  initialThreads,
  selectedBot,
  onRefresh,
  bots,
  dateFilter: externalDateFilter,
  onDateFilterChange,
}: ThreadsViewProps) {
  const [threadsWithMessageCount, setThreadsWithMessageCount] = useState<ThreadWithMessageCount[]>(initialThreads)
  const [dateFilter, setDateFilter] = useState<DateFilter>(externalDateFilter || "last30days")
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    setThreadsWithMessageCount(initialThreads)
  }, [initialThreads])

  const dateFilterOptions = [
    { label: "Last 24 Hours", value: "last24hours" },
    { label: "Last 7 Days", value: "last7days" },
    { label: "Last 30 Days", value: "last30days" },
    { label: "Last 90 Days", value: "last90days" },
    { label: "All Time", value: "allTime" },
  ]

  useEffect(() => {
    const handleDateFilterChanged = (event: Event) => {
      const customEvent = event as CustomEvent<DateFilter>
      setDateFilter(customEvent.detail)
    }

    window.addEventListener("dateFilterChanged", handleDateFilterChanged)

    return () => {
      window.removeEventListener("dateFilterChanged", handleDateFilterChanged)
    }
  }, [])

  const handleBotChange = (botId: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (botId) {
      params.set("botId", botId)
    } else {
      params.delete("botId")
    }
    router.push(`/?${params.toString()}`)
  }

  const dateFilteredThreads = threadsWithMessageCount

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button onClick={onRefresh} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Refresh
          </button>
          <Dropdown
            isOpen={dateDropdownOpen}
            setIsOpen={setDateDropdownOpen}
            buttonText={dateFilterOptions.find((option) => option.value === dateFilter)?.label || "Select Date Range"}
          >
            {dateFilterOptions.map((option) => (
              <button
                key={option.value}
                className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                onClick={() => {
                  setDateFilter(option.value)
                  setDateDropdownOpen(false)
                  if (onDateFilterChange) {
                    onDateFilterChange(option.value)
                  } else {
                    // Fallback to event dispatch for backward compatibility
                    window.dispatchEvent(new CustomEvent("dateFilterChanged", { detail: option.value }))
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </Dropdown>
        </div>

        <div>
          <select
            value={selectedBot || ""}
            onChange={(e) => handleBotChange(e.target.value === "" ? null : e.target.value)}
            className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">All Bots</option>
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-auto flex-grow">
        {dateFilteredThreads.length > 0 ? (
          dateFilteredThreads.map((thread) => <ThreadItem key={thread.id} thread={thread} />)
        ) : (
          <div className="text-gray-500 text-center">No threads found.</div>
        )}
      </div>
    </div>
  )
}
