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
  sentiment_justification?: string // Add sentiment justification
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

// Get callbacks with sentiment scores and justification - filter by bot_share_name if provided
export async function getCallbacksClient(limit = 50, botShareName?: string | null): Promise<Callback[]> {
  let query = supabase
    .from("callbacks")
    .select(`
      *,
      threads!inner(sentiment_score, sentiment_justification)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  // If a specific bot is selected, filter by that bot_share_name
  if (botShareName) {
    query = query.eq("bot_share_name", botShareName)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching callbacks:", error)
    return []
  }

  // Transform the data to include sentiment data at the top level
  const transformedData =
    data?.map((callback: any) => ({
      ...callback,
      sentiment_score: callback.threads?.sentiment_score || null,
      sentiment_justification: callback.threads?.sentiment_justification || null,
    })) || []

  return transformedData
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

// Add this new function to replace getCallbackStatsClient
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

  // Build queries with date filtering
  let totalCallbacksQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })
  let totalThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let callbackRequestsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let callbacksDroppedQuery = supabase.from("threads").select("id")

  // Apply bot filter if provided
  if (botShareName) {
    totalCallbacksQuery = totalCallbacksQuery.eq("bot_share_name", botShareName)
    totalThreadsQuery = totalThreadsQuery.eq("bot_share_name", botShareName)
    callbackRequestsQuery = callbackRequestsQuery.eq("bot_share_name", botShareName)
    callbacksDroppedQuery = callbacksDroppedQuery.eq("bot_share_name", botShareName)
  }

  // Apply date filter if not all time
  if (startDate) {
    totalCallbacksQuery = totalCallbacksQuery.gte("created_at", startDate)
    totalThreadsQuery = totalThreadsQuery.gte("created_at", startDate)
    callbackRequestsQuery = callbackRequestsQuery.gte("created_at", startDate)
    callbacksDroppedQuery = callbacksDroppedQuery.gte("created_at", startDate)
  }

  // Add specific filters - updated to use 'callback' field
  callbackRequestsQuery = callbackRequestsQuery.eq("callback", true)
  callbacksDroppedQuery = callbacksDroppedQuery.eq("callback", true)

  const [
    { count: totalCallbacks },
    { count: totalThreads },
    { count: callbackRequests },
    { data: threadsWithCallbacks },
  ] = await Promise.all([totalCallbacksQuery, totalThreadsQuery, callbackRequestsQuery, callbacksDroppedQuery])

  // Calculate callbacks dropped (threads with callback=true but no actual callback record)
  let callbacksDropped = 0
  if (threadsWithCallbacks && threadsWithCallbacks.length > 0) {
    const threadIds = threadsWithCallbacks.map((t) => t.id)

    // Get all callback records that exist for these thread IDs
    let existingCallbacksQuery = supabase.from("callbacks").select("thread_id").in("thread_id", threadIds)

    if (botShareName) {
      existingCallbacksQuery = existingCallbacksQuery.eq("bot_share_name", botShareName)
    }

    const { data: existingCallbacks } = await existingCallbacksQuery
    const existingThreadIds = new Set(existingCallbacks?.map((cb) => cb.thread_id) || [])

    // Count threads that have callback=true but NO corresponding callback record
    callbacksDropped = threadIds.filter((threadId) => !existingThreadIds.has(threadId)).length
  }

  // Calculate conversion rate
  const conversionRate =
    totalThreads && totalThreads > 0 ? Math.round(((callbackRequests || 0) / totalThreads) * 100) : 0

  return {
    totalCallbacks: totalCallbacks || 0,
    recentCallbacks: callbackRequests || 0,
    callbacksDropped,
    conversionRate,
    totalThreads: totalThreads || 0,
  }
}

// Add function to analyze callback data structure
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

export async function getMessagesByThreadId(threadId: string): Promise<Message[]> {
  // Validate threadId before making the query
  if (!threadId || threadId.trim() === "") {
    console.error("❌ getMessagesByThreadId: Invalid threadId provided:", threadId)
    return []
  }

  console.log("🔍 getMessagesByThreadId: Fetching messages for thread_id:", threadId)

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId) // This is correct - messages.thread_id = threads.id
    .order("created_at", { ascending: true })

  if (error) {
    console.error("❌ getMessagesByThreadId: Error fetching messages:", error)
    return []
  }

  console.log("✅ getMessagesByThreadId: Successfully fetched", data?.length || 0, "messages")
  return data || []
}

export async function getThreadById(id: string): Promise<Thread | null> {
  // Validate id before making the query
  if (!id || id.trim() === "") {
    console.error("❌ getThreadById: Invalid id provided:", id)
    return null
  }

  console.log("🔍 getThreadById: Fetching thread with id:", id)

  const { data, error } = await supabase.from("threads").select("*").eq("id", id).single()

  if (error) {
    console.error("❌ getThreadById: Error fetching thread:", error)
    return null
  }

  console.log("✅ getThreadById: Successfully fetched thread")
  return data
}

// Update the getUserBotAccess function to properly handle the RLS policy

export async function getUserBotAccess(): Promise<{
  role: "superadmin" | "admin" | "member" | null
  accessibleBots: string[]
  isSuperAdmin: boolean
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      console.log("🔐 No authenticated user found")
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    console.log("🔐 Getting bot access for user ID:", user.id)
    console.log("🔐 User email:", user.email)

    // Get user's bot assignments using the FK relationship (id column)
    const { data: botUsers, error } = await supabase
      .from("bot_users")
      .select("role, bot_share_name")
      .eq("id", user.id) // Use the FK relationship
      .eq("is_active", true)

    if (error) {
      console.error("❌ Error fetching user bot access:", error)
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    console.log("🔐 Bot users query result:", botUsers)

    if (!botUsers || botUsers.length === 0) {
      console.log("🔐 No bot access found for user")
      return { role: null, accessibleBots: [], isSuperAdmin: false }
    }

    // Check if user is superadmin
    const isSuperAdmin = botUsers.some((bu) => bu.role === "superadmin")
    console.log("🔐 Is superadmin:", isSuperAdmin)

    if (isSuperAdmin) {
      console.log("🔐 User is superadmin - they should have access to all bots")
      // For superadmin, we don't need to fetch all bots here - the component will do that
      // We just need to indicate they are superadmin
      return {
        role: "superadmin",
        accessibleBots: [], // Empty array - component will fetch all bots
        isSuperAdmin: true,
      }
    }

    // Get the user's highest role (admin or member)
    const isAdmin = botUsers.some((bu) => bu.role === "admin")
    const userRole = isAdmin ? "admin" : "member"

    // Regular admin/member - get their specific bot assignments
    const accessibleBots = botUsers
      .filter((bu) => bu.bot_share_name)
      .map((bu) => bu.bot_share_name)
      .filter(Boolean)

    console.log(`🔐 User is ${userRole} with access to bots:`, accessibleBots)

    return {
      role: userRole,
      accessibleBots,
      isSuperAdmin: false,
    }
  } catch (error) {
    console.error("❌ Exception in getUserBotAccess:", error)
    return { role: null, accessibleBots: [], isSuperAdmin: false }
  }
}

// Get bots that the current user has access to
export async function getAccessibleBotsClient(): Promise<Bot[]> {
  try {
    const { accessibleBots, isSuperAdmin } = await getUserBotAccess()

    if (accessibleBots.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from("bots")
      .select("*")
      .in("bot_share_name", accessibleBots)
      .order("client_name", { ascending: true })

    if (error) {
      console.error("Error fetching accessible bots:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Exception in getAccessibleBotsClient:", error)
    return []
  }
}

// Get comprehensive dashboard metrics with period comparison
export async function getDashboardMetrics(
  botShareName?: string | null,
  period: "today" | "last7days" | "last30days" | "alltime" | "custom" = "last30days",
) {
  console.log("📊 getDashboardMetrics: Starting calculation for bot:", botShareName, "period:", period)

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
      // Previous period is 30 days before that
      const sixtyDaysAgo = new Date(now)
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      previousStartDate = sixtyDaysAgo.toISOString()
      previousEndDate = thirtyDaysAgo.toISOString()
      break
    case "alltime":
      currentStartDate = null
      previousStartDate = null
      previousEndDate = null
      break
  }

  // Build current period queries
  let currentThreadsQuery = supabase.from("threads").select("*")
  let currentCallbacksQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })
  let currentCallbackThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let currentSentimentQuery = supabase.from("threads").select("sentiment_score")
  let currentResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  // Build previous period queries
  let previousThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let previousCallbacksQuery = supabase.from("callbacks").select("*", { count: "exact", head: true })
  let previousCallbackThreadsQuery = supabase.from("threads").select("*", { count: "exact", head: true })
  let previousSentimentQuery = supabase.from("threads").select("sentiment_score")
  let previousResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  // Build global response time queries (all bots)
  let currentGlobalResponseTimeQuery = supabase.from("threads").select("mean_response_time")
  let previousGlobalResponseTimeQuery = supabase.from("threads").select("mean_response_time")

  // Apply bot filter if provided
  if (botShareName) {
    currentThreadsQuery = currentThreadsQuery.eq("bot_share_name", botShareName)
    currentCallbacksQuery = currentCallbacksQuery.eq("bot_share_name", botShareName)
    currentCallbackThreadsQuery = currentCallbackThreadsQuery.eq("bot_share_name", botShareName)
    currentSentimentQuery = currentSentimentQuery.eq("bot_share_name", botShareName)
    currentResponseTimeQuery = currentResponseTimeQuery.eq("bot_share_name", botShareName)

    previousThreadsQuery = previousThreadsQuery.eq("bot_share_name", botShareName)
    previousCallbacksQuery = previousCallbacksQuery.eq("bot_share_name", botShareName)
    previousCallbackThreadsQuery = previousCallbackThreadsQuery.eq("bot_share_name", botShareName)
    previousSentimentQuery = previousSentimentQuery.eq("bot_share_name", botShareName)
    previousResponseTimeQuery = previousResponseTimeQuery.eq("bot_share_name", botShareName)
  }

  // Apply date filters for current period
  if (currentStartDate) {
    currentThreadsQuery = currentThreadsQuery.gte("created_at", currentStartDate)
    currentCallbacksQuery = currentCallbacksQuery.gte("created_at", currentStartDate)
    currentCallbackThreadsQuery = currentCallbackThreadsQuery.gte("created_at", currentStartDate)
    currentSentimentQuery = currentSentimentQuery.gte("created_at", currentStartDate)
    currentResponseTimeQuery = currentResponseTimeQuery.gte("created_at", currentStartDate)
    currentGlobalResponseTimeQuery = currentGlobalResponseTimeQuery.gte("created_at", currentStartDate)
  }

  // Apply date filters for previous period
  if (previousStartDate && previousEndDate) {
    previousThreadsQuery = previousThreadsQuery.gte("created_at", previousStartDate).lte("created_at", previousEndDate)
    previousCallbacksQuery = previousCallbacksQuery
      .gte("created_at", previousStartDate)
      .lte("created_at", previousEndDate)
    previousCallbackThreadsQuery = previousCallbackThreadsQuery
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

  // Add specific filters - FIXED: Use 'callback' instead of 'cb_requested'
  currentCallbackThreadsQuery = currentCallbackThreadsQuery.eq("callback", true)
  previousCallbackThreadsQuery = previousCallbackThreadsQuery.eq("callback", true)

  currentSentimentQuery = currentSentimentQuery.not("sentiment_score", "is", null)
  previousSentimentQuery = previousSentimentQuery.not("sentiment_score", "is", null)

  currentResponseTimeQuery = currentResponseTimeQuery.not("mean_response_time", "is", null)
  previousResponseTimeQuery = previousResponseTimeQuery.not("mean_response_time", "is", null)

  // Add filters for non-null response times
  currentGlobalResponseTimeQuery = currentGlobalResponseTimeQuery.not("mean_response_time", "is", null)
  previousGlobalResponseTimeQuery = previousGlobalResponseTimeQuery.not("mean_response_time", "is", null)

  // Execute all queries
  const [
    { data: currentThreads },
    { count: currentCallbacks },
    { count: currentCallbackThreads },
    { data: currentSentimentData },
    { data: currentResponseTimeData },
    { count: previousThreads },
    { count: previousCallbacks },
    { count: previousCallbackThreads },
    { data: previousSentimentData },
    { data: previousResponseTimeData },
    { data: currentGlobalResponseTimeData },
    { data: previousGlobalResponseTimeData },
  ] = await Promise.all([
    currentThreadsQuery,
    currentCallbacksQuery,
    currentCallbackThreadsQuery,
    currentSentimentQuery,
    currentResponseTimeQuery,
    previousThreadsQuery,
    previousCallbacksQuery,
    previousCallbackThreadsQuery,
    previousSentimentQuery,
    previousResponseTimeQuery,
    currentGlobalResponseTimeQuery,
    previousGlobalResponseTimeQuery,
  ])

  console.log("📊 Current threads with callback=true:", currentCallbackThreads)
  console.log("📊 Current actual callbacks:", currentCallbacks)

  // Calculate current period metrics
  const totalChats = currentThreads?.length || 0
  const totalCallbacks = currentCallbacks || 0
  const callbackPercentage = totalChats > 0 ? ((currentCallbackThreads || 0) / totalChats) * 100 : 0

  const averageSentiment = currentSentimentData?.length
    ? currentSentimentData.reduce((sum, thread) => sum + (thread.sentiment_score || 0), 0) / currentSentimentData.length
    : 0

  const averageResponseTime = currentResponseTimeData?.length
    ? currentResponseTimeData.reduce((sum, thread) => sum + (thread.mean_response_time || 0), 0) /
      currentResponseTimeData.length
    : 0

  // Calculate sentiment distribution
  const sentimentDistribution = [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: currentSentimentData?.filter((thread) => thread.sentiment_score === score).length || 0,
  }))

  // Calculate previous period metrics
  const previousTotalChats = previousThreads || 0
  const previousTotalCallbacks = previousCallbacks || 0
  const previousCallbackPercentage =
    previousTotalChats > 0 ? ((previousCallbackThreads || 0) / previousTotalChats) * 100 : 0

  const previousAverageSentiment = previousSentimentData?.length
    ? previousSentimentData.reduce((sum, thread) => sum + (thread.sentiment_score || 0), 0) /
      previousSentimentData.length
    : 0

  const previousAverageResponseTime = previousResponseTimeData?.length
    ? previousResponseTimeData.reduce((sum, thread) => sum + (thread.mean_response_time || 0), 0) /
      previousResponseTimeData.length
    : 0

  // Calculate global average response times
  const globalAverageResponseTime = currentGlobalResponseTimeData?.length
    ? currentGlobalResponseTimeData.reduce((sum, thread) => sum + (thread.mean_response_time || 0), 0) /
      currentGlobalResponseTimeData.length
    : 0

  const previousGlobalAverageResponseTime = previousGlobalResponseTimeData?.length
    ? previousGlobalResponseTimeData.reduce((sum, thread) => sum + (thread.mean_response_time || 0), 0) /
      previousGlobalResponseTimeData.length
    : 0

  // FIXED: Calculate dropped callbacks properly - threads with callback=true but NO linked callback record
  let currentDroppedCallbacks = 0
  let previousDroppedCallbacks = 0

  // Current period: threads requesting callbacks vs actual callback records
  const currentThreadsRequestingCallbacks = currentCallbackThreads || 0
  const currentActualCallbacks = currentCallbacks || 0
  currentDroppedCallbacks = Math.max(0, currentThreadsRequestingCallbacks - currentActualCallbacks)

  // Previous period: threads requesting callbacks vs actual callback records
  const previousThreadsRequestingCallbacks = previousCallbackThreads || 0
  const previousActualCallbacks = previousCallbacks || 0
  previousDroppedCallbacks = Math.max(0, previousThreadsRequestingCallbacks - previousActualCallbacks)

  console.log("📊 SIMPLIFIED CALCULATION:")
  console.log("📊 Current threads requesting callbacks:", currentThreadsRequestingCallbacks)
  console.log("📊 Current actual callback records:", currentActualCallbacks)
  console.log("📊 Current dropped callbacks:", currentDroppedCallbacks)

  console.log("📊 Final metrics:", {
    totalChats,
    totalCallbacks,
    callbackPercentage,
    droppedCallbacks: currentDroppedCallbacks,
  })

  return {
    totalChats,
    totalCallbacks,
    callbackPercentage,
    droppedCallbacks: currentDroppedCallbacks,
    averageSentiment,
    averageResponseTime,
    globalAverageResponseTime,
    sentimentDistribution,
    previousPeriodComparison: {
      totalChats: previousTotalChats,
      totalCallbacks: previousTotalCallbacks,
      callbackPercentage: previousCallbackPercentage,
      droppedCallbacks: previousDroppedCallbacks,
      averageSentiment: previousAverageSentiment,
      averageResponseTime: previousAverageResponseTime,
      globalAverageResponseTime: previousGlobalAverageResponseTime,
    },
  }
}
