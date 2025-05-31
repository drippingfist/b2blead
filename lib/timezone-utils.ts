/**
 * Utility functions for timezone handling
 */

/**
 * Format a date string to a specific timezone
 * @param dateString - ISO date string from database (assumed to be in UTC)
 * @param timezone - IANA timezone string (e.g., 'Asia/Bangkok')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in the specified timezone
 */
export function formatDateInTimezone(
  dateString: string,
  timezone?: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!dateString) return ""

  // Parse the date string - database timestamps are typically in UTC
  const date = new Date(dateString)

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string: ${dateString}`)
    return dateString
  }

  // Default timezone to UTC if not provided
  const tz = timezone || "UTC"

  try {
    // Use Intl.DateTimeFormat to convert UTC time to target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      ...options,
    })

    const result = formatter.format(date)

    // Debug logging
    console.log(`Timezone conversion debug:`, {
      input: dateString,
      parsedDate: date.toISOString(),
      targetTimezone: tz,
      result: result,
      utcTime: date.toUTCString(),
      localTime: date.toLocaleString(),
    })

    return result
  } catch (error) {
    console.warn(`Invalid timezone: ${tz}, falling back to UTC. Error:`, error)
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      ...options,
    }).format(date)
  }
}

/**
 * Format time only in a specific timezone
 * @param dateString - ISO date string from database (UTC)
 * @param timezone - IANA timezone string
 * @returns Time string in HH:MM:SS format in the target timezone
 */
export function formatTimeInTimezone(dateString: string, timezone?: string): string {
  console.log(`formatTimeInTimezone called with:`, { dateString, timezone })

  const result = formatDateInTimezone(dateString, timezone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  console.log(`formatTimeInTimezone result:`, result)
  return result
}

/**
 * Format date only in a specific timezone
 * @param dateString - ISO date string from database
 * @param timezone - IANA timezone string
 * @returns Date string in DD MMM YYYY format
 */
export function formatDateOnlyInTimezone(dateString: string, timezone?: string): string {
  return formatDateInTimezone(dateString, timezone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Format full datetime in a specific timezone
 * @param dateString - ISO date string from database
 * @param timezone - IANA timezone string
 * @returns Full datetime string
 */
export function formatFullDateTimeInTimezone(dateString: string, timezone?: string): string {
  return formatDateInTimezone(dateString, timezone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Get timezone abbreviation for display
 * @param timezone - IANA timezone string
 * @returns Timezone abbreviation (e.g., 'ICT', 'UTC')
 */
export function getTimezoneAbbreviation(timezone?: string): string {
  if (!timezone) return "UTC"

  try {
    const date = new Date()
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "short",
    })

    const parts = formatter.formatToParts(date)
    const timeZonePart = parts.find((part) => part.type === "timeZoneName")

    return timeZonePart?.value || timezone.split("/").pop() || "UTC"
  } catch (error) {
    console.warn(`Invalid timezone: ${timezone}`)
    return "UTC"
  }
}

/**
 * Test function to verify timezone conversion is working
 */
export function testTimezoneConversion() {
  const testDate = "2024-01-15T07:59:00.000Z" // UTC time
  const timezone = "Asia/Bangkok"

  console.log("=== TIMEZONE CONVERSION TEST ===")
  console.log("Input UTC time:", testDate)
  console.log("Target timezone:", timezone)

  const converted = formatTimeInTimezone(testDate, timezone)
  console.log("Converted time:", converted)
  console.log("Expected: 14:59:00 (UTC+7)")

  // Also test with current time
  const now = new Date().toISOString()
  console.log("\nCurrent time test:")
  console.log("UTC now:", now)
  console.log("Bangkok now:", formatTimeInTimezone(now, timezone))

  return converted
}
