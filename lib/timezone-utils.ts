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

  // Default timezone to Asia/Bangkok if not provided
  const tz = timezone || "Asia/Bangkok"

  try {
    // Use Intl.DateTimeFormat to convert UTC time to target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      ...options,
    })

    return formatter.format(date)
  } catch (error) {
    console.warn(`Invalid timezone: ${tz}, falling back to Asia/Bangkok. Error:`, error)
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
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
  return formatDateInTimezone(dateString, timezone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
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
  if (!timezone) return "ICT" // Default to ICT for Asia/Bangkok

  try {
    const date = new Date()
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "short",
    })

    const parts = formatter.formatToParts(date)
    const timeZonePart = parts.find((part) => part.type === "timeZoneName")

    return timeZonePart?.value || timezone.split("/").pop() || "ICT"
  } catch (error) {
    console.warn(`Invalid timezone: ${timezone}`)
    return "ICT"
  }
}
