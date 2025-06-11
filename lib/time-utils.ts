export interface TimePeriod {
  value: string
  label: string
}

export const TIME_PERIODS: TimePeriod[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
]

/**
 * Calculates start and end date ISO strings for a given time period value.
 * Uses 'created_at' field of threads for filtering.
 */
export function calculateDateRangeForQuery(periodValue: string): { startDate?: string; endDate?: string } {
  console.log("🕐 calculateDateRangeForQuery called with:", periodValue)

  const now = new Date()
  console.log("🕐 Current time:", now.toISOString())

  let startDate: Date | undefined
  let endDate: Date | undefined

  switch (periodValue) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    case "last7days":
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      break
    case "last30days":
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      break
    case "all":
    default:
      console.log("📅 No date filtering for 'all time'")
      return { startDate: undefined, endDate: undefined }
  }

  const result = {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  }

  console.log("📅 Calculated date range:", result)
  console.log("📅 Start date:", result.startDate)
  console.log("📅 End date:", result.endDate)

  return result
}
