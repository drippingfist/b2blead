"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

interface InvitationData {
  first_name: string
  surname: string
  timezone: string
  bot_share_name: string
  role: string
  invitation_id: string
  email: string
}

export async function completeUserSetup(invitationData: InvitationData) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    console.log("🔧 Setting up user:", user.id, "with invitation data:", invitationData)

    // Step 1: Create user profile
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: user.id,
      first_name: invitationData.first_name,
      surname: invitationData.surname,
      timezone: invitationData.timezone,
      bot_share_name: invitationData.bot_share_name,
    })

    if (profileError) {
      console.error("❌ Error creating user profile:", profileError)
      return { success: false, error: `Failed to create profile: ${profileError.message}` }
    }

    console.log("✅ User profile created")

    // Step 2: Create bot_users entry
    const { error: botUserError } = await supabase.from("bot_users").upsert({
      id: user.id,
      role: invitationData.role,
      bot_share_name: invitationData.bot_share_name,
      is_active: true,
    })

    if (botUserError) {
      console.error("❌ Error creating bot user:", botUserError)
      return { success: false, error: `Failed to create bot access: ${botUserError.message}` }
    }

    console.log("✅ Bot user access created")

    // Step 3: Clean up invitation record (if invitation_id exists)
    if (invitationData.invitation_id) {
      const { error: cleanupError } = await supabase
        .from("user_invitations")
        .delete()
        .eq("id", invitationData.invitation_id)

      if (cleanupError) {
        console.warn("⚠️ Warning: Could not clean up invitation record:", cleanupError)
        // Don't fail the setup for this
      } else {
        console.log("✅ Invitation record cleaned up")
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("❌ Error completing user setup:", error)
    return { success: false, error: error.message || "Failed to complete setup" }
  }
}
