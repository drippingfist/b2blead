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

    // Use service role client to bypass RLS
    const serviceClient = getServiceRoleClient()

    // Check user's bot assignments
    const { data: botUsers, error: botUsersError } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("user_id", user.id)

    // Check all threads for vrg-asia
    const { data: vrgThreads, error: vrgThreadsError } = await serviceClient
      .from("threads")
      .select("*")
      .eq("bot_share_name", "vrg-asia")
      .limit(10)

    // Check what bot_share_names exist in threads
    const { data: allBotNames, error: allBotNamesError } = await serviceClient
      .from("threads")
      .select("bot_share_name")
      .not("bot_share_name", "is", null)

    const uniqueBotNames = [...new Set(allBotNames?.map((t) => t.bot_share_name))]

    // Check if vrg-asia bot exists
    const { data: vrgBot, error: vrgBotError } = await serviceClient
      .from("bots")
      .select("*")
      .eq("bot_share_name", "vrg-asia")
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      botUsers: {
        data: botUsers,
        error: botUsersError,
      },
      vrgThreads: {
        data: vrgThreads,
        error: vrgThreadsError,
        count: vrgThreads?.length || 0,
      },
      vrgBot: {
        data: vrgBot,
        error: vrgBotError,
      },
      allBotNames: {
        data: uniqueBotNames,
        error: allBotNamesError,
      },
    })
  } catch (error) {
    console.error("❌ Debug API error:", error)
    return NextResponse.json({ error: error.message })
  }
}
