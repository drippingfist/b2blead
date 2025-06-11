export interface TimePeriod {
  value: string
  label: string
}

export const TIME_PERIODS: TimePeriod[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  // Add more periods if needed, e.g., "thisMonth", "lastMonth"
]

/**
 * Calculates start and end date ISO strings for a given time period value.
 * Uses 'created_at' field of threads for filtering.
 * @param periodValue - The string value of the time period (e.g., "today", "last7days").
 * @returns An object with startDate and endDate ISO strings, or undefined if "all".
 */
export function calculateDateRangeForQuery(periodValue: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  let startDate: Date | undefined
  let endDate: Date | undefined

  console.log("🕐 Calculating date range for period:", periodValue)
  console.log("🕐 Current time:", now.toISOString())

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
  return result
}
