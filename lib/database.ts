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
  role?: string
  starred?: boolean
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
  callback?: boolean
  count?: number
  mean_response_time?: number
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
  sentiment_score?: number
  sentiment_justification?: string
  message_preview?: string // Add this field
  thread_table_id?: string // Add this field for the actual thread table ID
}

// Get ALL bots from database (now respects RLS)
export async function getBotsClient(): Promise<Bot[]> {
  const { data, error } = await supabase.from("bots").select("*").order("bot_share_name", { ascending: true })

  if (error) {
    console.error("❌ getBotsClient: Error fetching bots:", error)
    return []
  }

  return data || []
}

// Get threads - filter by bot_share_name if provided
export async function getThreadsClient(limit = 50, botShareName?: string | null): Promise<Thread[]> {
  let query = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(limit)

  // If a specific bot is selected, filter by that bot_share_name
  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ getThreadsClient: Error fetching threads:", error)
    return []
  }

  return data || []
}

// Get callbacks with sentiment scores, justification, and message_preview from linked thread
export async function getCallbacksClient(limit = 50, botShareName?: string | null): Promise<Callback[]> {
  // First, get the callbacks
  let callbacksQuery = supabase.from("callbacks").select("*").order("created_at", { ascending: false }).limit(limit)

  // If a specific bot is selected, filter by that bot_share_name
  if (botShareName) {
    callbacksQuery = callbacksQuery.eq("bot_share_name", botShareName)
  }

  const { data: callbacksData, error: callbacksError } = await callbacksQuery

  if (callbacksError) {
    console.error("❌ Error fetching callbacks:", callbacksError)
    return []
  }

  if (!callbacksData || callbacksData.length === 0) {
    return callbacksData.map((callback) => ({
      ...callback,
      sentiment_score: null,
      sentiment_justification: null,
      message_preview: null,
      thread_table_id: null,
    }))
  }

  // Get all unique thread IDs from callbacks
  const threadIds = [...new Set(callbacksData.map((callback) => callback.id).filter(Boolean))]

  if (threadIds.length === 0) {
    return callbacksData.map((callback) => ({
      ...callback,
      sentiment_score: null,
      sentiment_justification: null,
      message_preview: null,
      thread_table_id: null,
    }))
  }

  // Fetch corresponding threads
  const { data: threadsData, error: threadsError } = await supabase
    .from("threads")
    .select("id, sentiment_score, sentiment_justification, message_preview")
    .in("id", threadIds)

  if (threadsError) {
    console.error("❌ Error fetching threads:", threadsError)
    // Return callbacks without thread data
    return callbacksData.map((callback) => ({
      ...callback,
      sentiment_score: null,
      sentiment_justification: null,
      message_preview: null,
      thread_table_id: null,
    }))
  }

  // Create a map of thread data by ID for quick lookup
  const threadsMap = new Map()
  threadsData?.forEach((thread) => {
    threadsMap.set(thread.id, thread)
  })

  // Merge callback and thread data
  const transformedData = callbacksData.map((callback: any) => {
    const threadData = threadsMap.get(callback.id)

    return {
      ...callback,
      sentiment_score: threadData?.sentiment_score || null,
      sentiment_justification: threadData?.sentiment_justification || null,
      message_preview: threadData?.message_preview || null,
      thread_table_id: threadData?.id || null,
    }
  })

  return transformedData
}

// Get current user's email
export async function getCurrentUserEmailClient(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email || null
}

// Simple getUserBotAccess function that uses API route
export async function getUserBotAccess(): Promise<{
  role: "superadmin" | "admin" | "member" | null
  accessibleBots: string[]
  isSuperAdmin: boolean
}> {
  try {
    const response = await fetch("/api/user-bot-access", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("❌ API response not ok:", response.status, response.statusText)
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    const data = await response.json()

    return data
  } catch (error) {
    console.error("❌ Exception in getUserBotAccess:", error)
    return { role: null, accessibleBots: [], isSuperAdmin: false }
  }
}

// Simple getAccessibleBotsClient function that uses API route
export async function getAccessibleBotsClient(): Promise<Bot[]> {
  try {
    const response = await fetch("/api/accessible-bots", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("❌ Accessible bots API response not ok:", response.status, response.statusText)
      return []
    }

    const bots = await response.json()

    return bots || []
  } catch (error) {
    console.error("❌ Exception in getAccessibleBotsClient:", error)
    return []
  }
}

// Get thread stats for a specific bot or all bots
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

  // Get callback requests - updated to use 'callback' field
  callbackQuery = callbackQuery.eq("callback", true)

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

// Get callback stats for a specific bot or all bots with a specified period
export async function getCallbackStatsClientWithPeriod(
  botShareName?: string | null,
  period: "today" | "last7days" | "last30days" | "last90days" | "alltime" = "last30days",
) {
  // Calculate date range based on period
  let startDate: string | null = null
  const now = new Date()

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      break
    case "last7days":
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      startDate = sevenDaysAgo.toISOString()
      break
    case "last30days":
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      startDate = thirtyDaysAgo.toISOString()
      break
    case "last90days":
      const ninetyDaysAgo = new Date(now)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      startDate = ninetyDaysAgo.toISOString()
      break
    case "alltime":
      startDate = null
      break
  }

  // STEP 1: Count threads with callback=true for selected bot and time period
  let threadsWithCallbackQuery = supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .eq("callback", true)

  // STEP 2: Count actual callback records for selected bot and time period
  let actualCallbacksQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })

  // STEP 3: Count total threads for conversion rate
  let totalThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })

  // Apply bot filter if provided
  if (botShareName) {
    threadsWithCallbackQuery = threadsWithCallbackQuery.eq("bot_share_name", botShareName)
    actualCallbacksQuery = actualCallbacksQuery.eq("bot_share_name", botShareName)
    totalThreadsQuery = totalThreadsQuery.eq("bot_share_name", botShareName)
  }

  // Apply date filter if not all time
  if (startDate) {
    threadsWithCallbackQuery = threadsWithCallbackQuery.gte("created_at", startDate)
    actualCallbacksQuery = actualCallbacksQuery.gte("created_at", startDate)
    totalThreadsQuery = totalThreadsQuery.gte("created_at", startDate)
  }

  const [{ count: threadsWithCallback }, { count: actualCallbacks }, { count: totalThreads }] = await Promise.all([
    threadsWithCallbackQuery,
    actualCallbacksQuery,
    totalThreadsQuery,
  ])

  // SIMPLE calculation: threads requesting callbacks MINUS actual callback records
  const callbacksDropped = Math.max(0, (threadsWithCallback || 0) - (actualCallbacks || 0))

  // Calculate conversion rate
  const conversionRate =
    totalThreads && totalThreads > 0 ? Math.round(((threadsWithCallback || 0) / totalThreads) * 100) : 0

  return {
    totalCallbacks: actualCallbacks || 0,
    recentCallbacks: threadsWithCallback || 0,
    callbacksDropped,
    conversionRate,
    totalThreads: totalThreads || 0,
  }
}

// Analyze callback columns for a specific bot or all bots
export async function analyzeCallbackColumns(botShareName?: string | null): Promise<{
  hasCompany: boolean
  hasCountry: boolean
  hasUrl: boolean
  hasPhone: boolean
  hasRevenue: boolean
}> {
  let query = supabase
    .from("callbacks")
    .select("user_company, user_country, user_url, user_phone, user_revenue")
    .limit(100)

  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data } = await query

  if (!data || data.length === 0) {
    return {
      hasCompany: false,
      hasCountry: false,
      hasUrl: false,
      hasPhone: false,
      hasRevenue: false,
    }
  }

  return {
    hasCompany: data.some((cb) => cb.user_company),
    hasCountry: data.some((cb) => cb.user_country),
    hasUrl: data.some((cb) => cb.user_url),
    hasPhone: data.some((cb) => cb.user_phone),
    hasRevenue: data.some((cb) => cb.user_revenue),
  }
}

// Get messages by thread ID
export async function getMessagesByThreadId(threadId: string): Promise<Message[]> {
  // Validate threadId before making the query
  if (!threadId || threadId.trim() === "") {
    console.error("❌ getMessagesByThreadId: Invalid threadId provided:", threadId)
    return []
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("❌ getMessagesByThreadId: Error fetching messages:", error)
    return []
  }

  return data || []
}

// Get thread by ID
export async function getThreadById(id: string): Promise<Thread | null> {
  // Validate id before making the query
  if (!id || id.trim() === "") {
    console.error("❌ getThreadById: Invalid id provided:", id)
    return null
  }

  const { data, error } = await supabase.from("threads").select("*").eq("id", id).single()

  if (error) {
    console.error("❌ getThreadById: Error fetching thread:", error)
    return null
  }

  return data
}

// Get dashboard metrics for a specific bot or all bots with a specified period and accessible bots
export async function getDashboardMetrics(
  botShareName?: string | null,
  period: "today" | "last7days" | "last30days" | "alltime" | "custom" = "last30days",
  accessibleBots?: string[],
) {
  // Calculate date ranges for current and previous periods
  const now = new Date()
  let currentStartDate: string | null = null
  let previousStartDate: string | null = null
  let previousEndDate: string | null = null

  switch (period) {
    case "today":
      currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      previousStartDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
      previousEndDate = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
      ).toISOString()
      break
    case "last7days":
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      currentStartDate = sevenDaysAgo.toISOString()
      const fourteenDaysAgo = new Date(now)
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      previousStartDate = fourteenDaysAgo.toISOString()
      previousEndDate = sevenDaysAgo.toISOString()
      break
    case "last30days":
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      currentStartDate = thirtyDaysAgo.toISOString()
      const sixtyDaysAgo = new Date(now)
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      previousStartDate = sixtyDaysAgo.toISOString()
      previousEndDate = thirtyDaysAgo.toISOString()
      break
    case "last90days":
      const ninetyDaysAgo = new Date(now)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      currentStartDate = ninetyDaysAgo.toISOString()
      const oneEightyDaysAgo = new Date(now)
      oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180)
      previousStartDate = oneEightyDaysAgo.toISOString()
      previousEndDate = ninetyDaysAgo.toISOString()
      break
    case "alltime":
      currentStartDate = null
      previousStartDate = null
      previousEndDate = null
      break
  }

  // ✅ FIX: Use a consistent, efficient count query for currentThreadsQuery
  let currentThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })

  let currentDroppedCallbacksQuery = supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("callback", true)
    .is("callbacks", null)

  let previousDroppedCallbacksQuery = supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("callback", true)
    .is("callbacks", null)

  let currentCallbackThreadsQuery = supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("callback", true)
  let currentActualCallbacksQuery = supabase.from("callbacks").select("id", { count: "exact", head: true })

  let previousCallbackThreadsQuery = supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("callback", true)
  let previousActualCallbacksQuery = supabase.from("callbacks").select("id", { count: "exact", head: true })

  let currentSentimentQuery = supabase.from("threads").select("sentiment_score")
  let currentResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  let previousThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let previousSentimentQuery = supabase.from("threads").select("sentiment_score")
  let previousResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  let currentGlobalResponseTimeQuery = supabase.from("threads").select("mean_response_time")
  let previousGlobalResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  // Apply bot filter based on selection and accessible bots
  if (botShareName) {
    currentThreadsQuery = currentThreadsQuery.eq("bot_share_name", botShareName)
    currentDroppedCallbacksQuery = currentDroppedCallbacksQuery.eq("bot_share_name", botShareName)
    currentCallbackThreadsQuery = currentCallbackThreadsQuery.eq("bot_share_name", botShareName)
    currentActualCallbacksQuery = currentActualCallbacksQuery.eq("bot_share_name", botShareName)
    currentSentimentQuery = currentSentimentQuery.eq("bot_share_name", botShareName)
    currentResponseTimeQuery = currentResponseTimeQuery.eq("bot_share_name", botShareName)

    previousThreadsQuery = previousThreadsQuery.eq("bot_share_name", botShareName)
    previousDroppedCallbacksQuery = previousDroppedCallbacksQuery.eq("bot_share_name", botShareName)
    previousCallbackThreadsQuery = previousCallbackThreadsQuery.eq("bot_share_name", botShareName)
    previousActualCallbacksQuery = previousActualCallbacksQuery.eq("bot_share_name", botShareName)
    previousSentimentQuery = previousSentimentQuery.eq("bot_share_name", botShareName)
    previousResponseTimeQuery = previousResponseTimeQuery.eq("bot_share_name", botShareName)
  } else if (accessibleBots && accessibleBots.length > 0) {
    currentThreadsQuery = currentThreadsQuery.in("bot_share_name", accessibleBots)
    currentDroppedCallbacksQuery = currentDroppedCallbacksQuery.in("bot_share_name", accessibleBots)
    currentCallbackThreadsQuery = currentCallbackThreadsQuery.in("bot_share_name", accessibleBots)
    currentActualCallbacksQuery = currentActualCallbacksQuery.in("bot_share_name", accessibleBots)
    currentSentimentQuery = currentSentimentQuery.in("bot_share_name", accessibleBots)
    currentResponseTimeQuery = currentResponseTimeQuery.in("bot_share_name", accessibleBots)

    previousThreadsQuery = previousThreadsQuery.in("bot_share_name", accessibleBots)
    previousDroppedCallbacksQuery = previousDroppedCallbacksQuery.in("bot_share_name", accessibleBots)
    previousCallbackThreadsQuery = previousCallbackThreadsQuery.in("bot_share_name", accessibleBots)
    previousActualCallbacksQuery = previousActualCallbacksQuery.in("bot_share_name", accessibleBots)
    previousSentimentQuery = previousSentimentQuery.in("bot_share_name", accessibleBots)
    previousResponseTimeQuery = previousResponseTimeQuery.in("bot_share_name", accessibleBots)
  }

  // Apply date filters for current period
  if (currentStartDate) {
    currentThreadsQuery = currentThreadsQuery.gte("created_at", currentStartDate)
    currentDroppedCallbacksQuery = currentDroppedCallbacksQuery.gte("created_at", currentStartDate)
    currentCallbackThreadsQuery = currentCallbackThreadsQuery.gte("created_at", currentStartDate)
    currentActualCallbacksQuery = currentActualCallbacksQuery.gte("created_at", currentStartDate)
    currentSentimentQuery = currentSentimentQuery.gte("created_at", currentStartDate)
    currentResponseTimeQuery = currentResponseTimeQuery.gte("created_at", currentStartDate)
    currentGlobalResponseTimeQuery = currentGlobalResponseTimeQuery.gte("created_at", currentStartDate)
  }

  // Apply date filters for previous period
  if (previousStartDate && previousEndDate) {
    previousThreadsQuery = previousThreadsQuery.gte("created_at", previousStartDate).lte("created_at", previousEndDate)
    previousDroppedCallbacksQuery = previousDroppedCallbacksQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousCallbackThreadsQuery = previousCallbackThreadsQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousActualCallbacksQuery = previousActualCallbacksQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousSentimentQuery = previousSentimentQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousResponseTimeQuery = previousResponseTimeQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousGlobalResponseTimeQuery = previousGlobalResponseTimeQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
  }

  currentSentimentQuery = currentSentimentQuery.not("sentiment_score", "is", null)
  previousSentimentQuery = previousSentimentQuery.not("sentiment_score", "is", null)
  currentResponseTimeQuery = currentResponseTimeQuery.not("mean_response_time", "is", null)
  previousResponseTimeQuery = previousResponseTimeQuery.not("mean_response_time", "is", null)
  currentGlobalResponseTimeQuery = currentGlobalResponseTimeQuery.not("mean_response_time", "is", null)
  previousGlobalResponseTimeQuery = previousGlobalResponseTimeQuery.not("mean_response_time", "is", null)

  const [
    { count: currentThreadsCount }, // ✅ FIX: Use the count from the query
    { count: currentDroppedCallbacks },
    { count: currentCallbackThreads },
    { count: currentActualCallbacks },
    { data: currentSentiment },
    { data: currentResponseTime },
    { count: previousThreadsCount }, // ✅ FIX: Use the count from the query
    { count: previousDroppedCallbacks },
    { count: previousCallbackThreads },
    { count: previousActualCallbacks },
    { data: previousSentiment },
    { data: previousResponseTime },
    { data: currentGlobalResponseTime },
    { data: previousGlobalResponseTime },
  ] = await Promise.all([
    currentThreadsQuery,
    currentDroppedCallbacksQuery,
    currentCallbackThreadsQuery,
    currentActualCallbacksQuery,
    currentSentimentQuery,
    currentResponseTimeQuery,
    previousThreadsQuery,
    previousDroppedCallbacksQuery,
    previousCallbackThreadsQuery,
    previousActualCallbacksQuery,
    previousSentimentQuery,
    previousResponseTimeQuery,
    currentGlobalResponseTimeQuery,
    previousGlobalResponseTimeQuery,
  ])

  // ✅ FIX: Use the count directly from the query result
  const totalChats = currentThreadsCount || 0
  const totalCallbacks = currentActualCallbacks || 0
  const callbackPercentage = totalChats > 0 ? ((currentCallbackThreads || 0) / totalChats) * 100 : 0
  const droppedCallbacks = currentDroppedCallbacks || 0

  const sentimentValues = currentSentiment?.map((t) => t.sentiment_score).filter((s) => s !== null) as number[]
  const averageSentiment =
    sentimentValues.length > 0 ? sentimentValues.reduce((sum, score) => sum + score, 0) / sentimentValues.length : 0
  const sentimentDistribution = [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: sentimentValues.filter((s) => Math.round(s) === score).length,
  }))

  const responseTimeValues = currentResponseTime
    ?.map((t) => t.mean_response_time)
    .filter((rt) => rt !== null) as number[]
  const averageResponseTime =
    responseTimeValues.length > 0
      ? responseTimeValues.reduce((sum, time) => sum + time, 0) / responseTimeValues.length
      : 0

  const globalResponseTimeValues = currentGlobalResponseTime
    ?.map((t) => t.mean_response_time)
    .filter((rt) => rt !== null) as number[]
  const globalAverageResponseTime =
    globalResponseTimeValues.length > 0
      ? globalResponseTimeValues.reduce((sum, time) => sum + time, 0) / globalResponseTimeValues.length
      : 0

  const prevSentimentValues = previousSentiment?.map((t) => t.sentiment_score).filter((s) => s !== null) as number[]
  const prevAverageSentiment =
    prevSentimentValues.length > 0
      ? prevSentimentValues.reduce((sum, score) => sum + score, 0) / prevSentimentValues.length
      : 0

  const prevResponseTimeValues = previousResponseTime
    ?.map((t) => t.mean_response_time)
    .filter((rt) => rt !== null) as number[]
  const prevAverageResponseTime =
    prevResponseTimeValues.length > 0
      ? prevResponseTimeValues.reduce((sum, time) => sum + time, 0) / prevResponseTimeValues.length
      : 0

  const prevGlobalResponseTimeValues = previousGlobalResponseTime
    ?.map((t) => t.mean_response_time)
    .filter((rt) => rt !== null) as number[]
  const prevGlobalAverageResponseTime =
    prevGlobalResponseTimeValues.length > 0
      ? prevGlobalResponseTimeValues.reduce((sum, time) => sum + time, 0) / prevGlobalResponseTimeValues.length
      : 0

  const prevCallbackPercentage =
    (previousThreadsCount || 0) > 0 ? ((previousCallbackThreads || 0) / (previousThreadsCount || 1)) * 100 : 0
  const prevDroppedCallbacks = previousDroppedCallbacks || 0

  return {
    totalChats,
    totalCallbacks,
    callbackPercentage,
    droppedCallbacks,
    averageSentiment,
    averageResponseTime,
    globalAverageResponseTime,
    sentimentDistribution,
    previousPeriodComparison: {
      totalChats: previousThreadsCount || 0, // ✅ FIX: Use the count
      totalCallbacks: previousActualCallbacks || 0,
      callbackPercentage: prevCallbackPercentage,
      droppedCallbacks: prevDroppedCallbacks,
      averageSentiment: prevAverageSentiment,
      averageResponseTime: prevAverageResponseTime,
      globalAverageResponseTime: prevGlobalAverageResponseTime,
    },
  }
}

// Get chat metrics for a specific bot or all bots with a specified period and accessible bots
export async function getChatMetrics(
  botShareName?: string | null,
  period: "today" | "last7days" | "last30days" | "alltime" | "custom" = "last30days",
  accessibleBots?: string[],
) {
  // Calculate date ranges for current and previous periods
  const now = new Date()
  let currentStartDate: string | null = null
  let previousStartDate: string | null = null
  let previousEndDate: string | null = null

  switch (period) {
    case "today":
      currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      // Previous period is yesterday
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      previousStartDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
      previousEndDate = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
      ).toISOString()
      break
    case "last7days":
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      currentStartDate = sevenDaysAgo.toISOString()
      // Previous period is 7 days before that
      const fourteenDaysAgo = new Date(now)
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      previousStartDate = fourteenDaysAgo.toISOString()
      previousEndDate = sevenDaysAgo.toISOString()
      break
    case "last30days":
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      currentStartDate = thirtyDaysAgo.toISOString()
      const sixtyDaysAgo = new Date(now)
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      previousStartDate = sixtyDaysAgo.toISOString()
      previousEndDate = thirtyDaysAgo.toISOString()
      break
    case "last90days":
      const ninetyDaysAgo = new Date(now)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      currentStartDate = ninetyDaysAgo.toISOString()
      const oneEightyDaysAgo = new Date(now)
      oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180)
      previousStartDate = oneEightyDaysAgo.toISOString()
      previousEndDate = ninetyDaysAgo.toISOString()
      break
    case "alltime":
      currentStartDate = null
      previousStartDate = null
      previousEndDate = null
      break
  }

  // Build current period queries
  let currentThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true }).gt("count", 0)
  let currentMessagesQuery = supabase.from("messages").select("*", { count: "exact", head: true })

  // Build previous period queries
  let previousThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true }).gt("count", 0)
  let previousMessagesQuery = supabase.from("messages").select("*", { count: "exact", head: true })

  // Apply bot filter based on selection and accessible bots
  if (botShareName) {
    // If a specific bot is selected, filter by that bot
    currentThreadsQuery = currentThreadsQuery.eq("bot_share_name", botShareName)
    currentMessagesQuery = currentMessagesQuery.eq("bot_share_name", botShareName)
    previousThreadsQuery = previousThreadsQuery.eq("bot_share_name", botShareName)
    previousMessagesQuery = previousMessagesQuery.eq("bot_share_name", botShareName)
  } else if (accessibleBots && accessibleBots.length > 0) {
    // If "All Bots" is selected and we have a list of accessible bots, filter by those bots
    currentThreadsQuery = currentThreadsQuery.in("bot_share_name", accessibleBots)
    currentMessagesQuery = currentMessagesQuery.in("bot_share_name", accessibleBots)
    previousThreadsQuery = previousThreadsQuery.in("bot_share_name", accessibleBots)
    previousMessagesQuery = previousMessagesQuery.in("bot_share_name", accessibleBots)
  }

  // Apply date filters for current period
  if (currentStartDate) {
    currentThreadsQuery = currentThreadsQuery.gte("created_at", currentStartDate)
    currentMessagesQuery = currentMessagesQuery.gte("created_at", currentStartDate)
  }

  // Apply date filters for previous period
  if (previousStartDate && previousEndDate) {
    previousThreadsQuery = previousThreadsQuery.gte("created_at", previousStartDate).lte("created_at", previousEndDate)
    previousMessagesQuery = previousMessagesQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
  }

  // Execute all queries in parallel
  const [
    { count: currentThreadsCount },
    { count: currentMessagesCount },
    { count: previousThreadsCount },
    { count: previousMessagesCount },
  ] = await Promise.all([currentThreadsQuery, currentMessagesQuery, previousThreadsQuery, previousMessagesQuery])

  // Calculate metrics
  const totalThreads = currentThreadsCount || 0
  const totalMessages = currentMessagesCount || 0
  const messagesPerThread = totalThreads > 0 ? totalMessages / totalThreads : 0

  const prevTotalThreads = previousThreadsCount || 0
  const prevTotalMessages = previousMessagesCount || 0
  const prevMessagesPerThread = prevTotalThreads > 0 ? prevTotalMessages / prevTotalThreads : 0

  return {
    totalThreads,
    totalMessages,
    messagesPerThread,
    previousPeriodComparison: {
      totalThreads: prevTotalThreads,
      totalMessages: prevTotalMessages,
      messagesPerThread: prevMessagesPerThread,
    },
  }
}

// Update thread starred status
export async function updateThreadStarred(threadId: string, starred: boolean): Promise<boolean> {
  const { error } = await supabase.from("threads").update({ starred }).eq("id", threadId)

  if (error) {
    console.error("❌ Error updating thread starred status:", error)
    return false
  }

  return true
}

// Update message starred status
export async function updateMessageStarred(messageId: string, starred: boolean): Promise<boolean> {
  const { error } = await supabase.from("messages").update({ starred }).eq("id", messageId)

  if (error) {
    console.error("❌ Error updating message starred status:", error)
    return false
  }

  return true
}
