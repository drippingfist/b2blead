import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest) {
  try {
    const { threadIds } = await request.json()

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return NextResponse.json({ error: "Thread IDs are required" }, { status: 400 })
    }

    // Get the authenticated user
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is superadmin
    const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()

    if (!superAdmin) {
      return NextResponse.json({ error: "Only superadmins can delete threads" }, { status: 403 })
    }

    // Delete the threads
    const { error: deleteError } = await supabase.from("threads").delete().in("id", threadIds)

    if (deleteError) {
      console.error("Error deleting threads:", deleteError)
      return NextResponse.json({ error: "Failed to delete threads" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${threadIds.length} thread(s)`,
    })
  } catch (error) {
    console.error("Exception in delete threads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
