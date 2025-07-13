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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { authorized } = await checkSuperAdminAccess()

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const assignmentId = params.id

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: "Assignment ID is required" }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // Delete the assignment
    const { error } = await adminClient.from("bot_users").delete().eq("id", assignmentId)

    if (error) {
      throw new Error(`Failed to delete assignment: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { authorized } = await checkSuperAdminAccess()

    if (!authorized) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const assignmentId = params.id
    const body = await request.json()
    const { role, is_active } = body

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: "Assignment ID is required" }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // Update the assignment
    const { data, error } = await adminClient
      .from("bot_users")
      .update({
        role,
        is_active,
      })
      .eq("id", assignmentId)
      .select()

    if (error) {
      throw new Error(`Failed to update assignment: ${error.message}`)
    }

    return NextResponse.json({ success: true, assignment: data ? data[0] : null })
  } catch (error: any) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
