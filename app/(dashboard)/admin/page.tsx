"use client"
import { useRouter } from "next/navigation"
import { checkAdminAccess, requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import AdminPageClient from "./admin-page-client"

export default async function AdminPage() {
  const router = useRouter()
  const { hasAccess, user, error } = await checkAdminAccess()

  // Redirect if no access
  requireAuth(hasAccess, "/dashboard")

  // Get user profile data
  const supabaseServer = createClient()
  const { data: profile } = await supabaseServer
    .from("user_profiles")
    .select("first_name, surname")
    .eq("id", user!.id)
    .single()

  const initialUserData = {
    id: user!.id,
    email: user!.email || "",
    firstName: profile?.first_name || "",
    surname: profile?.surname || "",
  }

  return <AdminPageClient initialUserData={initialUserData} isSuperAdmin={true} />
}
