import { supabase } from "@/lib/supabase/client"

export interface Thread {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  updated_at: string
  duration?: string
  message_preview?: string
  sentiment_score?: number
  sentiment_justification?: string
  callback?: boolean
  count?: number
  mean_response_time?: number
  starred?: boolean
}

export interface Message {
  id: string
  created_at: string
  typebot_id?: string
  thread_id?: string
  user_message?: string
  suggested_message?: string
  bot_message?: string
  user_id?: number
  user_name?: string
  user_email?: string
  user_phone?: string
  user_company?: string
  user_ip?: string
  user_country?: string
  sentiment_analysis?: number
  chat_history?: string
  user_callback_message?: string
  sentiment_analysis_justification?: string
  complete_chat_history?: string
  company_revenue?: string
  user_url?: string
  user_surname?: string
  role?: string
  starred?: boolean
}

// Get threads - filter by bot_share_name if provided
export async function getThreadsSimple(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  console.log("🧵 Fetching threads for bot_share_name:", botShareName || "ALL")

  try {
    // First check if user has access to this bot
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("❌ No authenticated user")
      return []
    }

    console.log("🔐 Getting bot access for user ID:", user.id)

    // Check if user is a superadmin
    const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()

    if (superAdmin) {
      console.log("✅ User is superadmin - fetching threads")
    } else {
      // Check if user has access to this specific bot
      const { data: botAccess, error: botAccessError } = await supabase
        .from("bot_users")
        .select("bot_share_name")
        .eq("user_id", user.id) // ✅ FIXED: Changed from "id" to "user_id"
        .eq("is_active", true)

      if (botAccessError) {
        console.error("❌ Error checking bot access:", botAccessError)
        return []
      }

      if (!botAccess || botAccess.length === 0) {
        console.log("❌ No bot access for user: No records found")
        return []
      }

      const accessibleBots = botAccess.map((b) => b.bot_share_name).filter(Boolean)

      if (botShareName && !accessibleBots.includes(botShareName)) {
        console.log("❌ User does not have access to this bot:", botShareName)
        return []
      }

      console.log("✅ User has access to bots:", accessibleBots)
    }

    // Now fetch the threads
    let query = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(limit)

    // If a specific bot is selected, filter by that bot_share_name
    if (botShareName) {
      query = query.eq("bot_share_name", botShareName)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Error fetching threads:", error)
      return []
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} threads`)
    return data || []
  } catch (error) {
    console.error("❌ Exception in getThreadsSimple:", error)
    return []
  }
}

// Get messages for a thread
export async function getMessagesSimple(threadId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Exception in getMessagesSimple:", error)
    return []
  }
}

// Star/unstar a thread
export async function toggleThreadStarred(threadId: string, isStarred: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from("threads").update({ starred: isStarred }).eq("id", threadId)

    if (error) {
      console.error("Error updating thread star status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Exception in toggleThreadStarred:", error)
    return false
  }
}

// Star/unstar a message
export async function toggleMessageStar(messageId: string, isStarred: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from("messages").update({ starred: isStarred }).eq("id", messageId)

    if (error) {
      console.error("Error updating message star status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Exception in toggleMessageStar:", error)
    return false
  }
}
