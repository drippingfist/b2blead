import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Create a service role client for admin operations that bypasses RLS
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET() {
  try {
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      return NextResponse.json({ error: "No authenticated user found" })
    }

    const serviceClient = getServiceRoleClient()

    // Debug info object
    const debugInfo: any = {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
    }

    // 1. Check if user is superadmin
    const { data: superUserRecord, error: superUserError } = await serviceClient
      .from("bot_super_users")
      .select("*")
      .eq("id", user.id)

    debugInfo.superadminCheck = {
      found: !!superUserRecord,
      error: superUserError?.message || null,
      data: superUserRecord,
    }

    // 2. Check bot_users assignments
    const { data: botUsers, error: botUsersError } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("user_id", user.id)

    debugInfo.botUsersCheck = {
      found: botUsers?.length || 0,
      error: botUsersError?.message || null,
      data: botUsers,
    }

    // 3. Check if vrg-asia bot exists
    const { data: vrgAsiaBot, error: vrgAsiaBotError } = await serviceClient
      .from("bots")
      .select("*")
      .eq("bot_share_name", "vrg-asia")
      .single()

    debugInfo.vrgAsiaBotCheck = {
      found: !!vrgAsiaBot,
      error: vrgAsiaBotError?.message || null,
      data: vrgAsiaBot,
    }

    // 4. Check threads for vrg-asia
    const { data: vrgAsiaThreads, error: vrgAsiaThreadsError } = await serviceClient
      .from("threads")
      .select("id, created_at, bot_share_name, message_preview")
      .eq("bot_share_name", "vrg-asia")
      .limit(10)

    debugInfo.vrgAsiaThreadsCheck = {
      found: vrgAsiaThreads?.length || 0,
      error: vrgAsiaThreadsError?.message || null,
      data: vrgAsiaThreads,
    }

    // 5. Check all threads (to see if there are any threads at all)
    const { data: allThreads, error: allThreadsError } = await serviceClient
      .from("threads")
      .select("id, created_at, bot_share_name")
      .limit(10)

    debugInfo.allThreadsCheck = {
      found: allThreads?.length || 0,
      error: allThreadsError?.message || null,
      data: allThreads?.map((t) => ({ id: t.id, bot_share_name: t.bot_share_name })),
    }

    // 6. Check what bot_share_names exist in threads
    const { data: uniqueBotNames, error: uniqueBotNamesError } = await serviceClient
      .from("threads")
      .select("bot_share_name")
      .not("bot_share_name", "is", null)

    const uniqueNames = [...new Set(uniqueBotNames?.map((t) => t.bot_share_name) || [])]
    debugInfo.uniqueBotNamesInThreads = {
      count: uniqueNames.length,
      names: uniqueNames,
      error: uniqueBotNamesError?.message || null,
    }

    // 7. Check what the user's API calls would return
    try {
      const userAccessResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/user-bot-access`, {
        headers: {
          Cookie: cookies().toString(),
        },
      })
      const userAccessData = await userAccessResponse.json()
      debugInfo.userAccessAPI = userAccessData
    } catch (error: any) {
      debugInfo.userAccessAPI = { error: error.message }
    }

    try {
      const accessibleBotsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/accessible-bots`, {
        headers: {
          Cookie: cookies().toString(),
        },
      })
      const accessibleBotsData = await accessibleBotsResponse.json()
      debugInfo.accessibleBotsAPI = {
        count: accessibleBotsData?.length || 0,
        data: accessibleBotsData,
      }
    } catch (error: any) {
      debugInfo.accessibleBotsAPI = { error: error.message }
    }

    // 8. Test the specific query that was failing
    const { data: botUsersWithUserId, error: botUsersWithUserIdError } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("user_id", user.id) // Using user_id (correct)

    const { data: botUsersWithId, error: botUsersWithIdError } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("id", user.id) // Using id (incorrect)

    debugInfo.botUsersComparison = {
      withUserId: {
        found: botUsersWithUserId?.length || 0,
        error: botUsersWithUserIdError?.message || null,
        data: botUsersWithUserId,
      },
      withId: {
        found: botUsersWithId?.length || 0,
        error: botUsersWithIdError?.message || null,
        data: botUsersWithId,
      },
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
