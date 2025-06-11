import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const botShareName = searchParams.get("botShareName")

    // Get date range if provided
    let dateRange = null
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    console.log("🔄 API: Fetching threads with params:", { limit, offset, botShareName, dateRange })

    // Use the existing getThreadsSimple function but we need to modify it to support offset
    const threads = await getThreadsSimpleWithOffset(limit, offset, botShareName, dateRange)

    console.log("✅ API: Fetched", threads.length, "threads")

    return NextResponse.json({
      threads,
      hasMore: threads.length === limit,
    })
  } catch (error: any) {
    console.error("❌ API Error fetching threads:", error)
    return NextResponse.json({ error: "Failed to fetch threads", details: error.message }, { status: 500 })
  }
}

// Modified version of getThreadsSimple that supports offset
async function getThreadsSimpleWithOffset(
  limit = 50,
  offset = 0,
  botShareName?: string | null,
  dateRange?: { start: Date; end: Date } | null,
) {
  const { supabase } = await import("@/lib/supabase/client")

  console.log("🧵 Fetching threads for bot_share_name:", botShareName || "ALL")
  console.log("🧵 Date range:", dateRange)
  console.log("🧵 Limit:", limit, "Offset:", offset)

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
    .eq("user_id", user.id)
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
    const { data: allBots } = await supabase.from("bots").select("bot_share_name").not("bot_share_name", "is", null)
    accessibleBots = allBots?.map((b) => b.bot_share_name).filter(Boolean) || []
  } else {
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
    .gt("count", 0)
    .range(offset, offset + limit - 1)

  // Filter by bot if specified
  if (botShareName) {
    if (accessibleBots.includes(botShareName)) {
      console.log("🔍 Filtering threads by bot_share_name:", botShareName)
      query = query.eq("bot_share_name", botShareName)
    } else {
      console.log("❌ User doesn't have access to bot:", botShareName)
      return []
    }
  } else {
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
