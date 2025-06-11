import { type NextRequest, NextResponse } from "next/server"
import { getThreadsSimple, getThreadsCount } from "@/lib/simple-database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const timePeriod = searchParams.get("timePeriod")

    console.log("🔍 API: Fetching threads with params:", { limit, offset, timePeriod })

    if (!timePeriod) {
      return NextResponse.json({ error: "Time period is required" }, { status: 400 })
    }

    // Convert time period to date range
    let dateRange: { start: Date; end: Date } | null = null
    const now = new Date()

    switch (timePeriod) {
      case "today":
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        }
        break
      case "last7days":
        dateRange = {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now,
        }
        break
      case "last30days":
        dateRange = {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
        }
        break
      case "last90days":
        dateRange = {
          start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          end: now,
        }
        break
      case "all":
        dateRange = null // No date filter for "all time"
        break
      default:
        return NextResponse.json({ error: "Invalid time period" }, { status: 400 })
    }

    // Get threads with pagination
    const threads = await getThreadsSimple(limit + offset, null, dateRange)

    // Slice to get only the requested page
    const paginatedThreads = threads.slice(offset, offset + limit)

    // Get total count for the time period
    const totalCount = await getThreadsCount(null, dateRange)

    // Check if there are more threads available
    const hasMore = threads.length > offset + limit

    console.log("✅ API: Returning", paginatedThreads.length, "threads, hasMore:", hasMore, "totalCount:", totalCount)

    return NextResponse.json({
      threads: paginatedThreads,
      hasMore,
      totalCount,
      timePeriod,
    })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 })
  }
}
