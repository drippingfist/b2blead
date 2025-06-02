"use server"

import { createClient } from "@/lib/supabase/server"
import { formatTimeInTimezone } from "@/lib/timezone-utils"

// Define types for clarity and type safety
export interface Message {
  id: string
  content: string
  role: "user" | "assistant" | "preset_message" // Added 'preset_message' based on image
  createdAt: string // ISO string (e.g., "2025-06-02T23:13:01.000Z")
}

export interface MessageThread {
  id: string
  createdAt: string // ISO string, typically the creation date of the thread
  messages: Message[] // Array of messages within this thread
  bot_share_name?: string // Add if your threads table has this column directly
  // Add other thread properties if needed (e.g., bot_id, status)
}

// Get the most recent threads with their messages for a specific bot
export async function getRecentThreadsWithMessages(
  botShareName: string | null,
  limit = 10,
  offset = 0,
  specificDate: string | null = null,
  cursor: string | null = null, // Add cursor for better pagination
) {
  try {
    console.log(
      "🔍 Fetching recent threads for bot:",
      botShareName || "ALL",
      "limit:",
      limit,
      "cursor:",
      cursor,
      "specificDate:",
      specificDate,
    )

    const supabase = createClient()

    // Step 1: Build the query for threads
    let threadsQuery = supabase.from("threads").select("*").order("created_at", { ascending: false }).limit(limit)

    if (botShareName) {
      threadsQuery = threadsQuery.eq("bot_share_name", botShareName)
    }

    // Apply cursor or date filtering
    if (cursor) {
      // For infinite scroll: get threads created before the cursor (older threads)
      console.log("🔄 Using cursor for pagination:", cursor)
      threadsQuery = threadsQuery.lt("created_at", cursor)
    } else if (specificDate) {
      // Add date filtering if specified (only for initial load)
      const startDate = new Date(specificDate)
      startDate.setUTCHours(0, 0, 0, 0)

      const endDate = new Date(specificDate)
      endDate.setUTCHours(23, 59, 59, 999)

      console.log("📅 Using date filter:", startDate.toISOString(), "to", endDate.toISOString())
      threadsQuery = threadsQuery.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    }

    const { data: threads, error: threadsError } = await threadsQuery

    if (threadsError) {
      console.error("❌ Error fetching threads:", threadsError)
      return []
    }

    if (!threads || threads.length === 0) {
      console.log("ℹ️ No threads found")
      return []
    }

    console.log(`✅ Found ${threads.length} threads`)
    console.log("📊 Thread date range:", threads[threads.length - 1]?.created_at, "to", threads[0]?.created_at)

    // Step 2: Get bot timezone for timestamp formatting
    let botTimezone = "UTC"
    if (botShareName) {
      const { data: botData } = await supabase
        .from("bots")
        .select("timezone")
        .eq("bot_share_name", botShareName)
        .single()

      if (botData?.timezone) {
        botTimezone = botData.timezone
      }
    }

    // Step 3: For each thread, get all its messages
    const threadsWithMessages = await Promise.all(
      threads.map(async (thread) => {
        const threadId = thread.id || thread.thread_id

        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true })

        if (messagesError) {
          console.error(`❌ Error fetching messages for thread ${threadId}:`, messagesError)
          return { ...thread, messages: [], formattedTime: formatTimeInTimezone(thread.created_at, botTimezone) }
        }

        // Format timestamps using bot timezone
        const messagesWithFormattedTime =
          messages?.map((message) => ({
            ...message,
            formattedTime: formatTimeInTimezone(message.created_at, botTimezone),
          })) || []

        return {
          ...thread,
          messages: messagesWithFormattedTime,
          formattedTime: formatTimeInTimezone(thread.created_at, botTimezone),
          formattedDate: formatTimeInTimezone(thread.created_at, botTimezone, "yyyy-MM-dd"),
          botTimezone,
        }
      }),
    )

    // Step 4: Sort threads from oldest to newest for display
    // This is crucial for infinite scroll to work properly
    const sortedThreads = threadsWithMessages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    console.log(
      "🔄 Sorted threads date range:",
      sortedThreads[0]?.created_at,
      "to",
      sortedThreads[sortedThreads.length - 1]?.created_at,
    )

    return sortedThreads
  } catch (error) {
    console.error("❌ Error in getRecentThreadsWithMessages:", error)
    return []
  }
}
