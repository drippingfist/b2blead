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

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`)
    }

    // Get user profiles
    const { data: userProfiles, error: profilesError } = await adminClient
      .from("user_profiles")
      .select("id, first_name, surname")

    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
    }

    // Combine auth users with profiles
    const users = authUsers.users.map((authUser) => {
      const profile = userProfiles?.find((p) => p.id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || "",
        first_name: profile?.first_name || "",
        surname: profile?.surname || "",
      }
    })

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
