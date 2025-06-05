import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: "No user found" })
    }

    const serviceClient = getServiceRoleClient()

    // Check all the different ways we might be querying bot_users
    console.log("🔍 DEBUG: Checking all bot access methods for user:", user.id)

    // Method 1: Check bot_users with user_id (CORRECT)
    const { data: botUsersCorrect, error: error1 } = await serviceClient
      .from("bot_users")
      .select("*")
      .eq("user_id", user.id)

    // Method 2: Check bot_users with id (WRONG - but let's see if this is being used somewhere)
    const { data: botUsersWrong, error: error2 } = await serviceClient.from("bot_users").select("*").eq("id", user.id)

    // Method 3: Check superadmin status
    const { data: superUser, error: error3 } = await serviceClient.from("bot_super_users").select("*").eq("id", user.id)

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      botUsersWithUserId: {
        data: botUsersCorrect,
        error: error1,
        count: botUsersCorrect?.length || 0,
      },
      botUsersWithId: {
        data: botUsersWrong,
        error: error2,
        count: botUsersWrong?.length || 0,
      },
      superUserCheck: {
        data: superUser,
        error: error3,
        isSuperAdmin: !!superUser,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
