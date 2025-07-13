import { createClient } from "@supabase/supabase-js"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AdminPageClient from "./admin-page-client"

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

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Check authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Check if user is superadmin
  let isSuperAdmin = false
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
        redirect("/dashboard")
      }

      isSuperAdmin = !!superAdminData
    } else {
      isSuperAdmin = rpcResult
    }
  } catch (error) {
    redirect("/dashboard")
  }

  if (!isSuperAdmin) {
    redirect("/dashboard")
  }

  const adminClient = getAdminClient()

  try {
    // Get all bot_users assignments with user details
    const { data: botUsersData, error: botUsersError } = await adminClient
      .from("bot_users")
      .select("*")
      .order("created_at", { ascending: false })

    if (botUsersError) {
      throw new Error(`Failed to fetch bot users: ${botUsersError.message}`)
    }

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`)
    }

    // Get user profiles
    const { data: userProfiles, error: profilesError } = await adminClient.from("user_profiles").select("*")

    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
    }

    // Get all bots
    const { data: allBots, error: botsError } = await adminClient
      .from("bots")
      .select("bot_share_name, client_name")
      .order("client_name")

    if (botsError) {
      throw new Error(`Failed to fetch bots: ${botsError.message}`)
    }

    // Create maps for quick lookup
    const authUsersMap = new Map()
    authUsers.users.forEach((authUser) => {
      authUsersMap.set(authUser.id, authUser)
    })

    const profilesMap = new Map()
    userProfiles?.forEach((profile) => {
      profilesMap.set(profile.id, profile)
    })

    // Transform bot_users data to include user details
    const usersWithDetails =
      botUsersData
        ?.map((botUser) => {
          const authUser = authUsersMap.get(botUser.user_id)
          const profile = profilesMap.get(botUser.user_id)

          if (!authUser) return null

          return {
            id: botUser.id, // This is the bot_users record ID
            user_id: botUser.user_id,
            email: authUser.email || "Unknown",
            first_name: profile?.first_name || "",
            surname: profile?.surname || "",
            role: botUser.role,
            bot_share_name: botUser.bot_share_name,
            is_active: botUser.is_active,
          }
        })
        .filter(Boolean) || []

    // Get all users for the dropdown (excluding superadmins)
    const allUsers = authUsers.users
      .filter((authUser) => {
        // Don't show super admins
        if (authUser.is_super_admin) {
          return false
        }

        // Don't show users who are superadmins in bot_users
        const hasSuperAdminRole = botUsersData?.some(
          (botUser) => botUser.user_id === authUser.id && botUser.role === "superadmin",
        )

        return !hasSuperAdminRole
      })
      .map((authUser) => {
        const profile = profilesMap.get(authUser.id)
        return {
          id: authUser.id,
          email: authUser.email || "Unknown",
          first_name: profile?.first_name || "",
          surname: profile?.surname || "",
        }
      })
      .sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""))

    return <AdminPageClient initialUsers={usersWithDetails} allBots={allBots || []} allUsers={allUsers} />
  } catch (error: any) {
    console.error("Error loading admin page:", error)
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading admin page: {error.message}
        </div>
      </div>
    )
  }
}
