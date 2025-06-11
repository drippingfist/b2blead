"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TIME_PERIODS } from "@/lib/time-utils"

interface ChatsHeaderProps {
  botDisplayName: string | null
  selectedBot: string | null
  selectedTimePeriod: string
  totalThreadsForPeriod: number
  timezoneAbbr: string
  onTimePeriodChange: (value: string) => void
  currentPage: number
  pageSize: number
  onPageChange: (newPage: number) => void
  isLoading: boolean
}

export default function ChatsHeader({
  botDisplayName,
  selectedBot,
  selectedTimePeriod,
  totalThreadsForPeriod,
  timezoneAbbr,
  onTimePeriodChange,
  currentPage,
  pageSize,
  onPageChange,
  isLoading,
}: ChatsHeaderProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get the label for the current time period
  const currentPeriodLabel = TIME_PERIODS.find((p) => p.value === selectedTimePeriod)?.label || "Selected Period"

  // Create the description text
  const getDescriptionText = () => {
    const threadCountText = isLoading ? "..." : totalThreadsForPeriod.toLocaleString()
    if (selectedBot && botDisplayName) {
      return `Showing threads for ${botDisplayName} from ${currentPeriodLabel} (${threadCountText} total)`
    } else {
      return `Showing threads from ${currentPeriodLabel} (${threadCountText} total)`
    }
  }

  // Pagination calculations
  const startItem = totalThreadsForPeriod > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalThreadsForPeriod)
  const totalPages = Math.ceil(totalThreadsForPeriod / pageSize)

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-[#212121] mb-1">Chats</h1>
        <p className="text-[#616161]">
          {getDescriptionText()}
          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">Times in {timezoneAbbr}</span>
        </p>
      </div>

      {isClient && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Time Period Selector */}
          <Select value={selectedTimePeriod} onValueChange={onTimePeriodChange} disabled={isLoading}>
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

          {/* Pagination Display */}
          {!isLoading && totalThreadsForPeriod > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalThreadsForPeriod.toLocaleString()}
              </span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || isLoading}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || isLoading}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading indicator for pagination */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
