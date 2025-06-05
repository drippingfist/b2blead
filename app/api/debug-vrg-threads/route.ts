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
      return NextResponse.json({ error: "No authenticated user" })
    }

    // Use service role client to bypass RLS for debugging
    const serviceClient = getServiceRoleClient()

    // 1. Check user's bot_users entries
    const { data: userBotAccess, error: botAccessError } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("user_id", user.id)

    // 2. Check all threads for vrg-asia (bypassing RLS)
    const { data: vrgThreadsAll, error: vrgThreadsError } = await serviceClient
      .from("threads")
      .select("*")
      .eq("bot_share_name", "vrg-asia")

    // 3. Check what the user can see with RLS enabled
    const { data: userVisibleThreads, error: userThreadsError } = await supabase
      .from("threads")
      .select("*")
      .eq("bot_share_name", "vrg-asia")

    // 4. Check if RLS is enabled on threads table
    const { data: rlsStatus, error: rlsError } = await serviceClient
      .rpc("check_rls_status", { table_name: "threads" })
      .single()

    // 5. Check what bot_share_names exist in threads
    const { data: allBotNames, error: botNamesError } = await serviceClient
      .from("threads")
      .select("bot_share_name")
      .not("bot_share_name", "is", null)

    const uniqueBotNames = [...new Set(allBotNames?.map((t) => t.bot_share_name))]

    // 6. Check if vrg-asia bot exists
    const { data: vrgBot, error: vrgBotError } = await serviceClient
      .from("bots")
      .select("*")
      .eq("bot_share_name", "vrg-asia")

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      userBotAccess: {
        data: userBotAccess,
        error: botAccessError,
        count: userBotAccess?.length || 0,
      },
      vrgThreadsAll: {
        data: vrgThreadsAll,
        error: vrgThreadsError,
        count: vrgThreadsAll?.length || 0,
        sample: vrgThreadsAll?.slice(0, 3).map((t) => ({
          id: t.id,
          bot_share_name: t.bot_share_name,
          created_at: t.created_at,
          message_preview: t.message_preview,
        })),
      },
      userVisibleThreads: {
        data: userVisibleThreads,
        error: userThreadsError,
        count: userVisibleThreads?.length || 0,
      },
      vrgBot: {
        data: vrgBot,
        error: vrgBotError,
      },
      allBotNames: {
        data: uniqueBotNames,
        error: botNamesError,
      },
      rlsStatus: {
        data: rlsStatus,
        error: rlsError,
      },
    })
  } catch (error) {
    console.error("❌ Debug API error:", error)
    return NextResponse.json({ error: error.message })
  }
}
