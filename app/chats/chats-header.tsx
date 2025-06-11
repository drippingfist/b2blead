"use client"

import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TIME_PERIODS } from "@/lib/time-utils"

interface ChatsHeaderProps {
  selectedTimePeriod: string
  onTimePeriodChange: (value: string) => void
}

export function ChatsHeader({ selectedTimePeriod, onTimePeriodChange }: ChatsHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
        <p className="text-muted-foreground">
          View all your chat threads with customers. You have superadmin access to all bots.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-8" />
        </div>

        {/* Time Period Selector */}
        <select
          value={selectedTimePeriod}
          onChange={(e) => {
            console.log("🕐 ChatsHeader: Time period selector changed to:", e.target.value)
            onTimePeriodChange(e.target.value)
          }}
          className="h-10 border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md sm:w-auto"
          aria-label="Select time period"
        >
          {TIME_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>

        <Button variant="outline" size="icon" className="h-10 w-10">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
