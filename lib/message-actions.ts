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
  limit = 20,
  offset = 0,
  specificDate: string | null = null,
  cursor: string | null = null, // Add cursor for better pagination
) {
  try {
    const supabase = createClient()

    // Step 1: Build the query for threads
    let threadsQuery = supabase.from("threads").select("*").order("created_at", { ascending: false }).limit(limit)

    if (botShareName) {
      threadsQuery = threadsQuery.eq("bot_share_name", botShareName)
    }

    // Apply cursor or date filtering
    if (cursor) {
      // For infinite scroll: get threads created before the cursor (older threads)
      threadsQuery = threadsQuery.lt("created_at", cursor)
    } else if (specificDate) {
      // Add date filtering if specified (only for initial load)
      const startDate = new Date(specificDate)
      startDate.setUTCHours(0, 0, 0, 0)

      const endDate = new Date(specificDate)
      endDate.setUTCHours(23, 59, 59, 999)

      threadsQuery = threadsQuery.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    }

    const { data: threads, error: threadsError } = await threadsQuery

    if (threadsError) {
      console.error("❌ Error fetching threads:", threadsError)
      return []
    }

    if (!threads || threads.length === 0) {
      return []
    }

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

    // Step 3: Fetch all messages for the retrieved threads in one batch
    const threadIds = threads.map((t) => t.id)
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError)
      return []
    }

    // Group messages by thread_id
    const messagesByThreadId = messagesData.reduce((acc, message) => {
      if (!acc[message.thread_id]) {
        acc[message.thread_id] = []
      }
      acc[message.thread_id].push({
        ...message,
        formattedTime: formatTimeInTimezone(message.created_at, botTimezone),
      })
      return acc
    }, {})

    // Step 3b: Fetch callback data for threads that have callback=true
    const threadsWithCallbacks = threads.filter((t) => t.callback === true)
    let callbackData = {}

    if (threadsWithCallbacks.length > 0) {
      // Fetch all callbacks in one query
      const { data: callbacks, error: callbacksError } = await supabase
        .from("callbacks")
        .select("*")
        .in(
          "id",
          threadsWithCallbacks.map((t) => t.id),
        )

      if (callbacksError) {
        console.error("❌ Error fetching callbacks:", callbacksError)
      } else if (callbacks && callbacks.length > 0) {
        // Create a map of thread_id to callback data
        callbackData = callbacks.reduce((acc, callback) => {
          acc[callback.id] = callback
          return acc
        }, {})
      }
    }

    // Step 4: Create threads with messages and format timestamps
    const threadsWithMessages = threads.map((thread) => {
      // Get callback data if this thread has callback=true
      const threadCallbackData = thread.callback === true ? callbackData[thread.id] : null

      return {
        ...thread,
        messages: messagesByThreadId[thread.id] || [],
        callbackData: threadCallbackData,
        formattedTime: formatTimeInTimezone(thread.created_at, botTimezone),
        formattedDate: formatTimeInTimezone(thread.created_at, botTimezone, "yyyy-MM-dd"),
        botTimezone,
      }
    })

    // Step 5: Sort threads from oldest to newest for display
    // This is crucial for infinite scroll to work properly
    const sortedThreads = threadsWithMessages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    return sortedThreads
  } catch (error) {
    console.error("❌ Error in getRecentThreadsWithMessages:", error)
    return []
  }
}
