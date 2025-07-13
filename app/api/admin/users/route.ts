import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Create admin client with service role key
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Check if user is superadmin
async function checkSuperAdminAccess() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { authorized: false, user: null }
  }

  // Check superadmin status
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc("is_superadmin")

    if (rpcError) {
      // Fallback: Check bot_super_users table directly
      const { data: superAdminData, error: superAdminError } = await supabase
        .from("bot_super_users")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (superAdminError && superAdminError.code !== "PGRST116") {
        return { authorized: false, user }
      }

      return { authorized: !!superAdminData, user }
    }

    return { authorized: rpcResult, user }
  } catch (error) {
    return { authorized: false, user }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { authorized } = await checkSuperAdminAccess()

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = getAdminClient()

    // Get all users from auth.users using admin client
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`)
    }

    // Get user profiles
    const { data: userProfiles, error: profilesError } = await adminClient.from("user_profiles").select("*")

    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
    }

    // Get bot users
    const { data: botUsers, error: botUsersError } = await adminClient.from("bot_users").select("*")

    if (botUsersError) {
      throw new Error(`Failed to fetch bot users: ${botUsersError.message}`)
    }

    // Create maps for quick lookup
    const profilesMap = new Map()
    userProfiles?.forEach((profile) => {
      profilesMap.set(profile.id, profile)
    })

    const botUsersMap = new Map()
    botUsers?.forEach((botUser) => {
      botUsersMap.set(botUser.user_id, botUser)
    })

    // Transform users
    const transformedUsers = authUsers.users
      .filter((authUser) => {
        // Don't show super admins
        if (authUser.is_super_admin) {
          return false
        }

        const botUser = botUsersMap.get(authUser.id)

        // Don't show superadmins based on role in bot_users table
        if (botUser?.role === "superadmin") {
          return false
        }

        return true
      })
      .map((authUser) => {
        const profile = profilesMap.get(authUser.id)
        const botUser = botUsersMap.get(authUser.id)

        return {
          id: authUser.id,
          email: authUser.email || "Unknown",
          first_name: profile?.first_name || "",
          surname: profile?.surname || "",
          role: botUser?.role || "member",
          bot_share_name: botUser?.bot_share_name || profile?.bot_share_name || "",
          is_active: botUser?.is_active || false,
        }
      })
      .sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""))

    return NextResponse.json({ success: true, users: transformedUsers })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
