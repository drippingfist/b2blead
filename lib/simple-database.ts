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
}

// Get threads filtered by bot_share_name
export async function getThreadsSimple(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  console.log("🧵 Fetching threads for bot_share_name:", botShareName || "ALL")

  let query = supabase.from("threads").select("*").order("created_at", { ascending: false }).limit(limit)

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
