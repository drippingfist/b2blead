"use client"

import { useEffect, useState } from "react"

interface MessagesCalendarProps {
  threadsWithMessages: any[]
  onDateClick?: (date: string) => void
}

export function MessagesCalendar({ threadsWithMessages = [], onDateClick = () => {} }: MessagesCalendarProps) {
  const today = new Date()
  const [threadDates, setThreadDates] = useState<Set<string>>(new Set())
  const [firstThreadDate, setFirstThreadDate] = useState<string | null>(null)

  // Get the last 3 months
  const months = []
  for (let i = 2; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push(date)
  }

  // Extract dates from threads
  useEffect(() => {
    if (!threadsWithMessages || threadsWithMessages.length === 0) {
      return
    }

    const dates = new Set<string>()
    let firstDate: string | null = null

    // Sort threads by created_at
    const sortedThreads = [...threadsWithMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    // Get the first thread date
    if (sortedThreads.length > 0) {
      const firstThread = sortedThreads[0]
      firstDate = new Date(firstThread.created_at).toISOString().split("T")[0]
    }

    // Collect all thread dates
    threadsWithMessages.forEach((thread) => {
      if (thread.created_at) {
        const date = new Date(thread.created_at).toISOString().split("T")[0]
        dates.add(date)
      }
    })

    setThreadDates(dates)
    setFirstThreadDate(firstDate)
  }, [threadsWithMessages])

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    return date.toDateString() === today.toDateString()
  }

  const isSameMonth = (date: Date | null, monthDate: Date) => {
    if (!date) return false
    return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear()
  }

  const hasThreads = (date: Date | null) => {
    if (!date) return false
    const dateString = date.toISOString().split("T")[0]
    return threadDates.has(dateString)
  }

  const isFirstThreadDate = (date: Date | null) => {
    if (!date || !firstThreadDate) return false
    const dateString = date.toISOString().split("T")[0]
    return dateString === firstThreadDate
  }

  const handleDateClick = (date: Date | null) => {
    if (!date) return
    const dateString = date.toISOString().split("T")[0]
    onDateClick(dateString)
  }

  return (
    <div className="h-full p-12 flex flex-col justify-center">
      <div className="space-y-8">
        {months.map((month, monthIndex) => (
          <div key={monthIndex} className="w-full">
            {/* Month Header */}
            <div className="flex items-center justify-center mb-4">
              <h3 className="text-lg font-medium text-[#212121]">{formatMonthYear(month)}</h3>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 text-sm">
              {/* Day Headers */}
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="h-10 flex items-center justify-center text-[#616161] font-medium">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {getDaysInMonth(month).map((date, dayIndex) => {
                const hasThread = date ? hasThreads(date) : false
                const isFirst = date ? isFirstThreadDate(date) : false

                return (
                  <div
                    key={dayIndex}
                    className={`h-10 flex items-center justify-center text-sm rounded cursor-pointer transition-colors ${
                      date
                        ? isSameMonth(date, month)
                          ? isToday(date)
                            ? "bg-[#038a71] text-white font-medium"
                            : isFirst
                              ? "bg-[#eef6ff] text-[#212121] font-medium"
                              : hasThread
                                ? "bg-[#effdf5] text-[#212121] hover:bg-[#dcf5e6]"
                                : "text-[#212121] hover:bg-[#f5f5f5]"
                          : "text-[#bdbdbd]"
                        : ""
                    }`}
                    onClick={() => date && handleDateClick(date)}
                  >
                    {date ? date.getDate() : ""}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
