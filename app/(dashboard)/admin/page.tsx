import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import AdminPageClient from "./admin-page-client"

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  console.log("[Admin Page] Starting admin page load")

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.log("[Admin Page] No user found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[Admin Page] User found:", user.id)

  // Check if user is superadmin using RPC function with fallback
  let isSuperAdmin = false

  try {
    console.log("[Admin Page] Checking superadmin status with RPC function")
    const { data: rpcResult, error: rpcError } = await supabase.rpc("is_superadmin")

    if (rpcError) {
      console.log("[Admin Page] RPC function failed, using fallback:", rpcError.message)

      // Fallback: direct table check
      const { data: superAdminData, error: tableError } = await supabase
        .from("bot_super_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (tableError) {
        console.log("[Admin Page] Table check failed:", tableError.message)
        isSuperAdmin = false
      } else {
        console.log("[Admin Page] Table check successful:", !!superAdminData)
        isSuperAdmin = !!superAdminData
      }
    } else {
      console.log("[Admin Page] RPC function successful:", rpcResult)
      isSuperAdmin = rpcResult
    }
  } catch (error) {
    console.error("[Admin Page] Error checking superadmin status:", error)
    isSuperAdmin = false
  }

  console.log("[Admin Page] Final superadmin status:", isSuperAdmin)

  // Get user profile data
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("first_name, surname")
    .eq("id", user.id)
    .single()

  const initialUserData = {
    id: user.id,
    email: user.email || "",
    firstName: userProfile?.first_name || "",
    surname: userProfile?.surname || "",
  }

  return <AdminPageClient initialUserData={initialUserData} isSuperAdmin={isSuperAdmin} />
}
