"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js" // Import for admin client

interface InvitationData {
  first_name: string
  surname: string
  timezone?: string // Keep in interface for backward compatibility
  bot_share_name: string
  role: string
  invitation_id?: string
  email: string
}

// Helper to get an admin client
const getAdminSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL or Service Role Key is not defined.")
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function completeUserSetup(invitationData: InvitationData) {
  try {
    // This client is authenticated as the new user (who just accepted the invite)
    const supabaseUserClient = createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser()

    if (userError || !user) {
      console.error("❌ completeUserSetup: User not authenticated or error fetching user", userError)
      return { success: false, error: "User not authenticated" }
    }

    // For creating profile and bot_users, we need admin privileges
    const supabaseAdmin = getAdminSupabase()

    // Step 1: Create user profile
    const { error: profileError } = await supabaseAdmin.from("user_profiles").upsert({
      id: user.id, // Use the new user's ID
      first_name: invitationData.first_name,
      surname: invitationData.surname,
      bot_share_name: invitationData.bot_share_name,
    })

    if (profileError) {
      console.error("❌ Error creating user profile:", profileError)
      return { success: false, error: `Failed to create profile: ${profileError.message}` }
    }

    // Step 2: Create bot_users entry
    const { error: botUserError } = await supabaseAdmin.from("bot_users").upsert({
      user_id: user.id, // Use the new user's ID
      role: invitationData.role,
      bot_share_name: invitationData.bot_share_name,
      is_active: true,
    })

    if (botUserError) {
      console.error("❌ Error creating bot user assignment:", botUserError)
      return { success: false, error: `Failed to create bot access: ${botUserError.message}` }
    }

    // Step 3: Clean up invitation record from user_invitations (if it exists there)
    // Fetch the original invitation_id if not passed directly, using the email.
    let invitationIdToClean = invitationData.invitation_id
    if (!invitationIdToClean && invitationData.email) {
      const { data: inviteRecord, error: findInviteError } = await supabaseAdmin
        .from("user_invitations")
        .select("id")
        .eq("email", invitationData.email)
        .single()

      if (findInviteError && findInviteError.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.warn("⚠️ Warning: Error finding invitation record to clean up:", findInviteError)
      } else if (inviteRecord) {
        invitationIdToClean = inviteRecord.id
      }
    }

    if (invitationIdToClean) {
      const { error: cleanupError } = await supabaseAdmin
        .from("user_invitations")
        .delete()
        .eq("id", invitationIdToClean)

      if (cleanupError) {
        console.warn("⚠️ Warning: Could not clean up invitation record:", cleanupError)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("❌ Error completing user setup:", error)
    return { success: false, error: error.message || "Failed to complete setup" }
  }
}
