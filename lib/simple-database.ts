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

// Get threads - filter by bot_share_name and date range if provided
export async function getThreadsSimple(
  limit = 50,
  botShareName?: string | null,
  dateRange?: { start: Date; end: Date } | null,
): Promise<Thread[]> {
  console.log("🧵 Fetching threads for bot_share_name:", botShareName || "ALL")
  console.log("🧵 Date range:", dateRange)

  // Get user's accessible bots
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    console.log("❌ No authenticated user")
    return []
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
    return []
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
    return []
  }

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
    .limit(limit)
    .gt("count", 0) // ✅ FILTER: Only show threads with count > 0

  // If a specific bot is selected, filter by that bot (if user has access)
  if (botShareName) {
    if (accessibleBots.includes(botShareName)) {
      console.log("🔍 Filtering threads by bot_share_name:", botShareName)
      query = query.eq("bot_share_name", botShareName)
    } else {
      console.log("❌ User doesn't have access to bot:", botShareName)
      return []
    }
  } else {
    // No specific bot selected, filter by all accessible bots
    console.log("🔍 Filtering threads by accessible bots:", accessibleBots)
    query = query.in("bot_share_name", accessibleBots)
  }

  // Apply date range filter if provided
  if (dateRange) {
    console.log("📅 Applying date range filter:", dateRange.start, "to", dateRange.end)
    query = query.gte("created_at", dateRange.start.toISOString()).lte("created_at", dateRange.end.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ Error fetching threads:", error)
    throw new Error(`Failed to fetch threads: ${error.message}`)
  }

  console.log("✅ Successfully fetched", data?.length || 0, "threads")
  return data || []
}

// Get count of threads - filter by bot_share_name and date range if provided
export async function getThreadsCount(
  botShareName?: string | null,
  dateRange?: { start: Date; end: Date } | null,
): Promise<number> {
  console.log("🔢 Getting thread count for bot_share_name:", botShareName || "ALL")
  console.log("🔢 Date range:", dateRange)

  // Get user's accessible bots
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    console.log("❌ No authenticated user")
    return 0
  }

  // Get user's bot access using FK relationship
  const { data: botUsers, error: accessError } = await supabase
    .from("bot_users")
    .select("role, bot_share_name")
    .eq("user_id", user.id)
    .eq("is_active", true)

  if (accessError || !botUsers || botUsers.length === 0) {
    console.log("❌ No bot access for user:", accessError?.message || "No records found")
    return 0
  }

  // Check if user is superadmin
  const isSuperAdmin = botUsers.some((bu) => bu.role === "superadmin")

  let accessibleBots: string[] = []

  if (isSuperAdmin) {
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

  if (accessibleBots.length === 0) {
    console.log("❌ No accessible bots found")
    return 0
  }

  let query = supabase.from("threads").select("*", { count: "exact", head: true }).gt("count", 0)

  // If a specific bot is selected, filter by that bot (if user has access)
  if (botShareName) {
    if (accessibleBots.includes(botShareName)) {
      query = query.eq("bot_share_name", botShareName)
    } else {
      console.log("❌ User doesn't have access to bot:", botShareName)
      return 0
    }
  } else {
    // No specific bot selected, filter by all accessible bots
    query = query.in("bot_share_name", accessibleBots)
  }

  // Apply date range filter if provided
  if (dateRange) {
    console.log("📅 Applying date range filter to count:", dateRange.start, "to", dateRange.end)
    query = query.gte("created_at", dateRange.start.toISOString()).lte("created_at", dateRange.end.toISOString())
  }

  const { count, error } = await query

  if (error) {
    console.error("❌ Error getting thread count:", error)
    return 0
  }

  console.log("✅ Thread count:", count)
  return count || 0
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
