import { createClient } from "@/lib/supabase/server"
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
  timezone?: string // Make sure timezone is included
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

export interface BotUser {
  id: string
  created_at: string
  user_email: string
  bot_share_name: string
  role: "admin" | "editor" | "viewer"
  is_active: boolean
  created_by?: string
  notes?: string
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
  count?: number // Add count column for message count
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

// Get current user's email
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email || null
}

// Get bots that the current user has access to
export async function getUserAccessibleBots(): Promise<string[]> {
  const userEmail = await getCurrentUserEmail()
  if (!userEmail) return []

  // james@vrg.asia has access to all bots
  if (userEmail === "james@vrg.asia") {
    const supabase = createClient()
    const { data: bots } = await supabase.from("bots").select("bot_share_name").not("bot_share_name", "is", null)
    return bots?.map((bot) => bot.bot_share_name).filter(Boolean) || []
  }

  // For other users, check bot_users table
  const supabase = createClient()
  const { data: botUsers } = await supabase
    .from("bot_users")
    .select("bot_share_name")
    .eq("user_email", userEmail)
    .eq("is_active", true)

  return botUsers?.map((bu) => bu.bot_share_name).filter(Boolean) || []
}

// Get bots with access control
export async function getBots(): Promise<Bot[]> {
  const accessibleBots = await getUserAccessibleBots()
  if (accessibleBots.length === 0) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bots:", error)
    return []
  }

  return data || []
}

// Add this function to get the selected bot from localStorage on the client side
export function getSelectedBotFromClient(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("selectedBot")
  }
  return null
}

// Update the getThreads function to filter by selected bot if specified
export async function getThreads(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  const accessibleBots = await getUserAccessibleBots()
  if (accessibleBots.length === 0) return []

  const supabase = createClient()
  let query = supabase
    .from("threads")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("updated_at", { ascending: false })
    .limit(limit)

  // If a specific bot is selected, filter by that bot
  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching threads:", error)
    return []
  }

  return data || []
}

// Similarly update the getCallbacks function
export async function getCallbacks(limit = 50, botShareName?: string | null): Promise<Callback[]> {
  const accessibleBots = await getUserAccessibleBots()
  if (accessibleBots.length === 0) return []

  const supabase = createClient()
  let query = supabase
    .from("callbacks")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("created_at", { ascending: false })
    .limit(limit)

  // If a specific bot is selected, filter by that bot
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

// Get bot users for management
export async function getBotUsers(): Promise<BotUser[]> {
  const userEmail = await getCurrentUserEmail()
  if (userEmail !== "james@vrg.asia") return [] // Only super admin can see all bot users

  const supabase = createClient()
  const { data, error } = await supabase.from("bot_users").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bot users:", error)
    return []
  }

  return data || []
}

export async function getCallbackById(id: string): Promise<Callback | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("callbacks").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching callback:", error)
    return null
  }

  return data
}

export async function getCallbacksByThreadId(threadId: string): Promise<Callback[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("callbacks")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching callbacks by thread:", error)
    return []
  }

  return data || []
}

// Update the getCallbackStats function to filter by selected bot
export async function getCallbackStats(botShareName?: string | null) {
  const accessibleBots = await getUserAccessibleBots()
  if (accessibleBots.length === 0) return { totalCallbacks: 0, recentCallbacks: 0, topCountries: [] }

  const supabase = createClient()

  // Use the selected bot or all accessible bots
  const botsToQuery = botShareName ? [botShareName] : accessibleBots

  // Get total callback count
  let query = supabase.from("callbacks").select("*", { count: "exact", head: true })

  if (botsToQuery.length > 0) {
    query = query.in("bot_share_name", botsToQuery)
  }

  const { count: totalCallbacks } = await query

  // Get callbacks from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let recentQuery = supabase
    .from("callbacks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())

  if (botsToQuery.length > 0) {
    recentQuery = recentQuery.in("bot_share_name", botsToQuery)
  }

  const { count: recentCallbacks } = await recentQuery

  // Get callbacks by country (top 5)
  let countryQuery = supabase.from("callbacks").select("user_country").not("user_country", "is", null)

  if (botsToQuery.length > 0) {
    countryQuery = countryQuery.in("bot_share_name", botsToQuery)
  }

  const { data: countryData } = await countryQuery

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

export async function getMessages(limit = 50): Promise<Message[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching messages:", error)
    return []
  }

  return data || []
}

export async function getMessagesByThreadId(threadId: string): Promise<Message[]> {
  const supabase = createClient()
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

export async function getMessageStats() {
  const supabase = createClient()

  // Get total message count
  const { count: totalMessages } = await supabase.from("messages").select("*", { count: "exact", head: true })

  // Get messages from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: recentMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())

  // Get average sentiment
  const { data: sentimentData } = await supabase
    .from("messages")
    .select("sentiment_analysis")
    .not("sentiment_analysis", "is", null)

  const avgSentiment = sentimentData?.length
    ? sentimentData.reduce((sum, msg) => sum + (msg.sentiment_analysis || 0), 0) / sentimentData.length
    : 0

  return {
    totalMessages: totalMessages || 0,
    recentMessages: recentMessages || 0,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
  }
}

export async function getThreadById(id: string): Promise<Thread | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("threads").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching thread:", error)
    return null
  }

  return data
}

// Update the getThreadStats function to filter by selected bot
export async function getThreadStats(botShareName?: string | null) {
  const accessibleBots = await getUserAccessibleBots()
  if (accessibleBots.length === 0) return { totalThreads: 0, recentThreads: 0, callbackRequests: 0, avgSentiment: 0 }

  const supabase = createClient()

  // Use the selected bot or all accessible bots
  const botsToQuery = botShareName ? [botShareName] : accessibleBots

  // Get total thread count for accessible bots
  const { count: totalThreads } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)

  // Get threads from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: recentThreads } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)
    .gte("created_at", sevenDaysAgo.toISOString())

  // Get callback requests count
  const { count: callbackRequests } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)
    .eq("cb_requested", true)

  // Get average sentiment
  const { data: sentimentData } = await supabase
    .from("threads")
    .select("sentiment_score")
    .in("bot_share_name", botsToQuery)
    .not("sentiment_score", "is", null)

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

// Client-side function to get current user's email
export async function getCurrentUserEmailClient(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email || null
}

// Client-side function to get bots that the current user has access to
export async function getUserAccessibleBotsClient(): Promise<string[]> {
  const userEmail = await getCurrentUserEmailClient()
  if (!userEmail) return []

  // james@vrg.asia has access to all bots
  if (userEmail === "james@vrg.asia") {
    const { data: bots } = await supabase.from("bots").select("bot_share_name").not("bot_share_name", "is", null)
    return bots?.map((bot) => bot.bot_share_name).filter(Boolean) || []
  }

  // For other users, check bot_users table
  const { data: botUsers } = await supabase
    .from("bot_users")
    .select("bot_share_name")
    .eq("user_email", userEmail)
    .eq("is_active", true)

  return botUsers?.map((bu) => bu.bot_share_name).filter(Boolean) || []
}

// Client-side function to get threads with access control
export async function getThreadsClient(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  const accessibleBots = await getUserAccessibleBotsClient()
  if (accessibleBots.length === 0) return []

  let query = supabase
    .from("threads")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("updated_at", { ascending: false })
    .limit(limit)

  // If a specific bot is selected, filter by that bot
  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching threads:", error)
    return []
  }

  return data || []
}

// Client-side function to get callbacks with access control
export async function getCallbacksClient(limit = 50, botShareName?: string | null): Promise<Callback[]> {
  const accessibleBots = await getUserAccessibleBotsClient()
  if (accessibleBots.length === 0) return []

  let query = supabase
    .from("callbacks")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("created_at", { ascending: false })
    .limit(limit)

  // If a specific bot is selected, filter by that bot
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

// Client-side function to get bots with access control
export async function getBotsClient(): Promise<Bot[]> {
  const accessibleBots = await getUserAccessibleBotsClient()
  if (accessibleBots.length === 0) return []

  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .in("bot_share_name", accessibleBots)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bots:", error)
    return []
  }

  return data || []
}

// Client-side function to get thread stats
export async function getThreadStatsClient(botShareName?: string | null) {
  const accessibleBots = await getUserAccessibleBotsClient()
  if (accessibleBots.length === 0) return { totalThreads: 0, recentThreads: 0, callbackRequests: 0, avgSentiment: 0 }

  // Use the selected bot or all accessible bots
  const botsToQuery = botShareName ? [botShareName] : accessibleBots

  // Get total thread count for accessible bots
  const { count: totalThreads } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)

  // Get threads from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: recentThreads } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)
    .gte("created_at", sevenDaysAgo.toISOString())

  // Get callback requests count
  const { count: callbackRequests } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .in("bot_share_name", botsToQuery)
    .eq("cb_requested", true)

  // Get average sentiment
  const { data: sentimentData } = await supabase
    .from("threads")
    .select("sentiment_score")
    .in("bot_share_name", botsToQuery)
    .not("sentiment_score", "is", null)

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

// Client-side function to get callback stats
export async function getCallbackStatsClient(botShareName?: string | null) {
  const accessibleBots = await getUserAccessibleBotsClient()
  if (accessibleBots.length === 0) return { totalCallbacks: 0, recentCallbacks: 0, topCountries: [] }

  // Use the selected bot or all accessible bots
  const botsToQuery = botShareName ? [botShareName] : accessibleBots

  // Get total callback count
  let query = supabase.from("callbacks").select("*", { count: "exact", head: true })

  if (botsToQuery.length > 0) {
    query = query.in("bot_share_name", botsToQuery)
  }

  const { count: totalCallbacks } = await query

  // Get callbacks from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let recentQuery = supabase
    .from("callbacks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString())

  if (botsToQuery.length > 0) {
    recentQuery = recentQuery.in("bot_share_name", botsToQuery)
  }

  const { count: recentCallbacks } = await recentQuery

  // Get callbacks by country (top 5)
  let countryQuery = supabase.from("callbacks").select("user_country").not("user_country", "is", null)

  if (botsToQuery.length > 0) {
    countryQuery = countryQuery.in("bot_share_name", botsToQuery)
  }

  const { data: countryData } = await countryQuery

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
