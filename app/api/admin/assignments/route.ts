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

    // Get all bot_users assignments
    const { data: assignments, error } = await adminClient
      .from("bot_users")
      .select(`
        id,
        user_id,
        bot_share_name,
        role,
        is_active
      `)
      .order("user_id")

    if (error) {
      throw new Error(`Failed to fetch assignments: ${error.message}`)
    }

    return NextResponse.json({ success: true, assignments: assignments || [] })
  } catch (error: any) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized } = await checkSuperAdminAccess()

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, bot_share_name, role, is_active } = body

    if (!user_id || !bot_share_name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: user_id, bot_share_name, role" },
        { status: 400 },
      )
    }

    const adminClient = getAdminClient()

    // Check if assignment already exists
    const { data: existingAssignment } = await adminClient
      .from("bot_users")
      .select("id")
      .eq("user_id", user_id)
      .eq("bot_share_name", bot_share_name)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { success: false, error: "Assignment already exists for this user and bot" },
        { status: 409 },
      )
    }

    // Create new assignment
    const { data, error } = await adminClient
      .from("bot_users")
      .insert({
        user_id,
        bot_share_name,
        role,
        is_active: is_active ?? true,
      })
      .select()

    if (error) {
      throw new Error(`Failed to create assignment: ${error.message}`)
    }

    return NextResponse.json({ success: true, assignment: data ? data[0] : null })
  } catch (error: any) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
