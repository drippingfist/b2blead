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
  cb_requested?: boolean
  count?: number
  mean_response_time?: number
  starred?: boolean // Add starred field
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

export interface Callback {
  id: string
  created_at: string
  bot_share_name?: string
  thread_id?: string
  user_name?: string
  user_first_name?: string
  user_surname?: string
  user_email?: string
  user_phone?: string
  user_url?: string
  user_country?: string
  user_company?: string
  user_revenue?: string
  document_referrer?: string
  ibdata?: string
  user_ip?: string
  user_cb_message?: string
}

// Get threads - filter by bot_share_name if provided
export async function getThreadsSimple(
  limit = 50,
  botShareName?: string | null,
  dateFilter: "today" | "last7days" | "last30days" | "last90days" | "alltime" = "last30days",
  page = 0,
): Promise<{ threads: Thread[]; totalCount: number }> {
  console.log(
    "🧵 Fetching threads for bot_share_name:",
    botShareName || "ALL",
    "with filter:",
    dateFilter,
    "page:",
    page,
  )

  // Get user's accessible bots
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    console.log("❌ No authenticated user")
    return { threads: [], totalCount: 0 }
  }

  console.log("🔐 Getting bot access for user ID:", user.id)

  // Get user's bot access using FK relationship
  const { data: botUsers, error: accessError } = await supabase
    .from("bot_users")
    .select("role, bot_share_name")
    .eq("user_id", user.id) // Use the FK relationship with user_id
    .eq("is_active", true)

  if (accessError || !botUsers || botUsers.length === 0) {
    console.log("❌ No bot access for user:", accessError?.message || "No records found")
    return { threads: [], totalCount: 0 }
  }

  console.log("🔐 Bot users found:", botUsers)

  // Check if user is superadmin
  const isSuperAdmin = botUsers.some((bu) => bu.role === "superadmin")

  let accessibleBots: string[] = []

  if (isSuperAdmin) {
    console.log("🔐 User is superadmin - getting all bots")
    // Superadmin can see all bots
    const { data: allBots } = await supabase.from("bots").select("bot_share_name").not("bot_share_name", "is", null)

    accessibleBots = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
  } else {
    // Regular admin/member - get their specific bot assignments
    accessibleBots = botUsers
      .filter((bu) => bu.bot_share_name)
      .map((bu) => bu.bot_share_name)
      .filter(Boolean)
  }

  console.log("🔐 Accessible bots:", accessibleBots)

  if (accessibleBots.length === 0) {
    console.log("❌ No accessible bots found")
    return { threads: [], totalCount: 0 }
  }

  // First, get the total count without pagination
  let countQuery = supabase.from("threads").select("id", { count: "exact" }).gt("count", 0) // ✅ FILTER: Only show threads with count > 0

  // Apply date filter
  if (dateFilter !== "alltime") {
    const now = new Date()
    let cutoffDate: Date

    switch (dateFilter) {
      case "today":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "last7days":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "last30days":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "last90days":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    countQuery = countQuery.gte("created_at", cutoffDate.toISOString())
  }

  // If a specific bot is selected, filter by that bot (if user has access)
  if (botShareName) {
    if (accessibleBots.includes(botShareName)) {
      console.log("🔍 Filtering threads by bot_share_name:", botShareName)
      countQuery = countQuery.eq("bot_share_name", botShareName)
    } else {
      console.log("❌ User doesn't have access to bot:", botShareName)
      return { threads: [], totalCount: 0 }
    }
  } else {
    // No specific bot selected, filter by all accessible bots
    console.log("🔍 Filtering threads by accessible bots:", accessibleBots)
    countQuery = countQuery.in("bot_share_name", accessibleBots)
  }

  // Get total count
  const { count: totalCount, error: countError } = await countQuery

  if (countError) {
    console.error("❌ Error getting thread count:", countError)
    return { threads: [], totalCount: 0 }
  }

  // Now get the actual data with pagination
  let query = supabase
    .from("threads")
    .select(`
      *,
      callbacks!callbacks_id_fkey(
        user_name,
        user_first_name,
        user_surname,
        user_email
      )
    `)
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1) // Pagination using range
    .gt("count", 0) // ✅ FILTER: Only show threads with count > 0

  // Apply the same filters as the count query
  if (dateFilter !== "alltime") {
    const now = new Date()
    let cutoffDate: Date

    switch (dateFilter) {
      case "today":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "last7days":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "last30days":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "last90days":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    query = query.gte("created_at", cutoffDate.toISOString())
  }

  if (botShareName) {
    if (accessibleBots.includes(botShareName)) {
      query = query.eq("bot_share_name", botShareName)
    } else {
      return { threads: [], totalCount: 0 }
    }
  } else {
    query = query.in("bot_share_name", accessibleBots)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ Error fetching threads:", error)
    throw new Error(`Failed to fetch threads: ${error.message}`)
  }

  console.log("✅ Successfully fetched", data?.length || 0, "threads out of", totalCount)
  return { threads: data || [], totalCount: totalCount || 0 }
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
export async function toggleThreadStarred(threadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First get the current starred status
    const { data: currentThread, error: fetchError } = await supabase
      .from("threads")
      .select("starred")
      .eq("id", threadId)
      .single()

    if (fetchError) {
      console.error("❌ Error fetching thread starred status:", fetchError)
      return { success: false, error: fetchError.message }
    }

    // Toggle the starred status
    const newStarredStatus = !currentThread.starred

    const { error: updateError } = await supabase
      .from("threads")
      .update({ starred: newStarredStatus })
      .eq("id", threadId)

    if (updateError) {
      console.error("❌ Error updating thread starred status:", updateError)
      return { success: false, error: updateError.message }
    }

    console.log("✅ Successfully toggled starred status for thread:", threadId, "to:", newStarredStatus)
    return { success: true }
  } catch (error: any) {
    console.error("❌ Exception toggling starred status:", error)
    return { success: false, error: error.message }
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
