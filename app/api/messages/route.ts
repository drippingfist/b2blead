import { type NextRequest, NextResponse } from "next/server"
import { getRecentThreadsWithMessages } from "@/lib/message-actions"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bot = searchParams.get("bot")
    const cursor = searchParams.get("cursor")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const date = searchParams.get("date")

    console.log("API: Fetching messages with params:", { bot, cursor, limit, date })

    const threads = await getRecentThreadsWithMessages(bot, limit, 0, date, cursor)

    return NextResponse.json(threads)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
