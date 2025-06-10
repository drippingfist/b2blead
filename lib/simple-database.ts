import { supabase } from "@/lib/supabaseClient"

export interface Thread {
  id: string
  created_at: string
  updated_at: string
  title: string
  content: string
  bot_share_name: string
  user_id: string
}

export async function getThreadsSimple(
  limit = 50,
  botShareName?: string | null,
  dateFilter: "today" | "last7days" | "last30days" | "last90days" | "alltime" = "last30days",
): Promise<Thread[]> {
  console.log("🧵 getThreadsSimple: Fetching threads for bot:", botShareName || "ALL", "with filter:", dateFilter)

  let query = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(limit)

  // Apply bot filter if provided
  if (botShareName) {
    console.log("🔍 Filtering threads by bot_share_name:", botShareName)
    query = query.eq("bot_share_name", botShareName)
  }

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

    console.log("🗓️ Applying date filter:", dateFilter, "cutoff:", cutoffDate.toISOString())
    query = query.gte("created_at", cutoffDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ getThreadsSimple: Error fetching threads:", error)
    return []
  }

  console.log("✅ getThreadsSimple: Successfully fetched", data?.length || 0, "threads")
  return data || []
}
