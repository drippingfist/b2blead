import { supabase } from "./supabaseClient"

export type Thread = {
  id: string
  created_at: string
  title: string
  owner: string
  owner_name: string
  bot_share_name: string | null
  count: number
}

export type DateFilter = "alltime" | "today" | "last7days" | "last30days" | "last90days"

export async function getThreadsSimple(
  limit = 50,
  botShareName?: string | null,
  dateFilter: "today" | "last7days" | "last30days" | "last90days" | "alltime" = "last30days",
): Promise<Thread[]> {
  // Add date filtering logic before the existing query
  let query = supabase.from("threads").select(`
   *,
   count:messages(count)
 `)

  // Apply date filter to the query
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

  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit)

  if (error) {
    console.error(error)
    throw error
  }

  return data as Thread[]
}
