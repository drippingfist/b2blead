"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIME_PERIODS } from "@/lib/time-utils"

interface ChatsHeaderProps {
  botDisplayName: string | null
  selectedBot: string | null
  selectedTimePeriod: string
  totalThreads: number
  timezoneAbbr: string
  onTimePeriodChange: (value: string) => void
}

export default function ChatsHeader({
  botDisplayName,
  selectedBot,
  selectedTimePeriod,
  totalThreads,
  timezoneAbbr,
  onTimePeriodChange,
}: ChatsHeaderProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get the label for the current time period
  const currentPeriodLabel = TIME_PERIODS.find((p) => p.value === selectedTimePeriod)?.label || "Last 30 Days"

  // Create the description text
  const getDescriptionText = () => {
    if (selectedBot && botDisplayName) {
      return `Showing threads for ${botDisplayName} from ${currentPeriodLabel} (${totalThreads} total)`
    } else {
      return `Showing threads from ${currentPeriodLabel} (${totalThreads} total)`
    }
  }

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#212121] mb-1">Chats</h1>
        <p className="text-[#616161]">
          {getDescriptionText()}
          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
        </p>
      </div>

      {isClient && (
        <div className="flex items-center space-x-2">
          <Select value={selectedTimePeriod} onValueChange={onTimePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
