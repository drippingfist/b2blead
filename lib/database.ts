import { supabase } from "@/lib/supabase/client"

export interface Bot {
  id: string
  created_at: string
  bot_share_name?: string
  client_name?: string
  client_description?: string
  client_url?: string
  client_email?: string
  groq_model?: string
  groq_suggested_questions?: string
  timezone?: string
  sentiment_analysis_prompt?: string
  gpt_assistant_id?: string
  gpt_assistant_system_prompt?: string
  button_background_colour?: string
  button_gif_url?: string
  favicon_png?: string
  apify_dataset_id?: string
  apify_key_value_store?: string
  vector_id?: string
  client_email_name?: string
  typebot_id?: string
  LIVE?: boolean
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
}

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

// Get ALL bots from database
export async function getBotsClient(): Promise<Bot[]> {
  console.log("🔍 getBotsClient: Fetching ALL bots...")

  const { data, error } = await supabase.from("bots").select("*").order("bot_share_name", { ascending: true })

  if (error) {
    console.error("❌ getBotsClient: Error fetching bots:", error)
    return []
  }

  console.log("✅ getBotsClient: Successfully fetched", data?.length || 0, "bots")
  return data || []
}

// Get threads - filter by bot_share_name if provided
export async function getThreadsClient(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  console.log("🧵 getThreadsClient: Fetching threads for bot:", botShareName || "ALL")

  let query = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(limit)

  // If a specific bot is selected, filter by that bot_share_name
  if (botShareName) {
    console.log("🔍 Filtering threads by bot_share_name:", botShareName)
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ getThreadsClient: Error fetching threads:", error)
    return []
  }

  console.log("✅ getThreadsClient: Successfully fetched", data?.length || 0, "threads")
  return data || []
}

// Get callbacks - filter by bot_share_name if provided
export async function getCallbacksClient(limit = 50, botShareName?: string | null): Promise<Callback[]> {
  let query = supabase.from("callbacks").select("*").order("created_at", { ascending: false }).limit(limit)

  // If a specific bot is selected, filter by that bot_share_name
  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching callbacks:", error)
    return []
  }

  return data || []
}

// Get current user's email
export async function getCurrentUserEmailClient(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email || null
}

// Get thread stats - filter by bot_share_name if provided
export async function getThreadStatsClient(botShareName?: string | null) {
  let totalQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let recentQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let callbackQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let sentimentQuery = supabase.from("threads").select("sentiment_score")

  if (botShareName) {
    totalQuery = totalQuery.eq("bot_share_name", botShareName)
    recentQuery = recentQuery.eq("bot_share_name", botShareName)
    callbackQuery = callbackQuery.eq("bot_share_name", botShareName)
    sentimentQuery = sentimentQuery.eq("bot_share_name", botShareName)
  }

  // Get threads from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  recentQuery = recentQuery.gte("created_at", sevenDaysAgo.toISOString())

  // Get callback requests
  callbackQuery = callbackQuery.eq("cb_requested", true)

  // Get sentiment data
  sentimentQuery = sentimentQuery.not("sentiment_score", "is", null)

  const [{ count: totalThreads }, { count: recentThreads }, { count: callbackRequests }, { data: sentimentData }] =
    await Promise.all([totalQuery, recentQuery, callbackQuery, sentimentQuery])

  const avgSentiment = sentimentData?.length
    ? sentimentData.reduce((sum, thread) => sum + (thread.sentiment_score || 0), 0) / sentimentData.length
    : 0

  return {
    totalThreads: totalThreads || 0,
    recentThreads: recentThreads || 0,
    callbackRequests: callbackRequests || 0,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
  }
}

// Get callback stats - filter by bot_share_name if provided
export async function getCallbackStatsClient(botShareName?: string | null) {
  let totalQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })
  let recentQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })
  let countryQuery = supabase.from("callbacks").select("user_country")

  if (botShareName) {
    totalQuery = totalQuery.eq("bot_share_name", botShareName)
    recentQuery = recentQuery.eq("bot_share_name", botShareName)
    countryQuery = countryQuery.eq("bot_share_name", botShareName)
  }

  // Get callbacks from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  recentQuery = recentQuery.gte("created_at", sevenDaysAgo.toISOString())

  // Get country data
  countryQuery = countryQuery.not("user_country", "is", null)

  const [{ count: totalCallbacks }, { count: recentCallbacks }, { data: countryData }] = await Promise.all([
    totalQuery,
    recentQuery,
    countryQuery,
  ])

  const countryStats = countryData?.reduce((acc: { [key: string]: number }, callback) => {
    const country = callback.user_country || "Unknown"
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {})

  const topCountries = Object.entries(countryStats || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)

  return {
    totalCallbacks: totalCallbacks || 0,
    recentCallbacks: recentCallbacks || 0,
    topCountries,
  }
}

export async function getMessagesByThreadId(threadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages by thread:", error)
    return []
  }

  return data || []
}

export async function getThreadById(id: string): Promise<Thread | null> {
  const { data, error } = await supabase.from("threads").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching thread:", error)
    return null
  }

  return data
}
