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

// Get threads filtered by bot_share_name with callback information
export async function getThreadsSimple(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  console.log("🧵 Fetching threads for bot_share_name:", botShareName || "ALL")

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

  // If a specific bot is selected, filter by bot_share_name
  if (botShareName) {
    console.log("🔍 Filtering threads by bot_share_name:", botShareName)
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ Error fetching threads:", error)
    throw new Error(`Failed to fetch threads: ${error.message}`)
  }

  console.log("✅ Successfully fetched", data?.length || 0, "threads")
  return data || []
}

// Toggle starred status for a thread
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
