import { createClient } from "@/lib/supabase/server"

// This function can be used as a fallback to check for manual invitation records
export async function checkAndActivateInvitation(userId: string, email: string) {
  const supabase = createClient()

  try {
    // Check if there's a manual invitation record for this email
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("email", email)
      .single()

    if (invitationError || !invitation) {
      console.log("No manual invitation found for", email)
      return false
    }

    // Create user profile from invitation
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: userId,
      first_name: invitation.first_name,
      surname: invitation.surname,
      timezone: invitation.timezone,
      bot_share_name: invitation.bot_share_name,
    })

    if (profileError) {
      console.error("Error creating user profile:", profileError)
      return false
    }

    // Create bot_users entry - UPDATED to use user_id
    const { error: botUserError } = await supabase.from("bot_users").upsert({
      user_id: userId, // Changed from 'id' to 'user_id'
      role: invitation.role,
      bot_share_name: invitation.bot_share_name,
      is_active: true,
    })

    if (botUserError) {
      console.error("Error creating bot user:", botUserError)
      return false
    }

    // Delete the invitation record
    await supabase.from("user_invitations").delete().eq("id", invitation.id)

    return true
  } catch (error) {
    console.error("Error activating invitation:", error)
    return false
  }
}
