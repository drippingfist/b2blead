import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function DELETE(request: NextRequest) {
  try {
    const { threadIds } = await request.json()

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return NextResponse.json({ error: "Thread IDs are required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // The permission check is now handled by the PostgreSQL SECURITY DEFINER function
    // The function itself will verify if the calling user (auth.uid()) is a superadmin
    console.log("🗑️ API: Calling delete_threads_as_superadmin for", threadIds.length, "threads")

    const { data, error: rpcError } = await supabase.rpc("delete_threads_as_superadmin", {
      thread_ids_to_delete: threadIds,
    })

    if (rpcError) {
      console.error("❌ Error calling delete_threads_as_superadmin RPC:", rpcError)

      // Check for specific permission denied error from the function
      if (rpcError.message.includes("not authorized to delete threads")) {
        return NextResponse.json({ error: "Forbidden: Only superadmins can delete threads." }, { status: 403 })
      }

      return NextResponse.json({ error: `Failed to delete threads: ${rpcError.message}` }, { status: 500 })
    }

    // The RPC function returns a JSON object with success status and message
    if (data && data.success) {
      console.log("✅ Successfully deleted threads:", data.message)
      return NextResponse.json({
        success: true,
        message: data.message || `Successfully deleted ${threadIds.length} thread(s).`,
        deleted_count: data.deleted_count,
      })
    } else {
      console.error("❌ RPC indicated failure:", data)
      return NextResponse.json(
        {
          error: data?.message || "Failed to delete threads (RPC indicated failure).",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("❌ Exception in delete threads API route:", error)
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 })
  }
}
