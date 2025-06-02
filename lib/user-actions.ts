"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
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

// Invite a new user - create invitation record THEN send Supabase invitation email
export async function inviteUser(userData: {
  email: string
  first_name: string
  surname: string
  role: string
  timezone: string
  bot_share_name: string
  invited_by: string
}) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    const adminClient = getAdminClient()

    console.log("🔍 Starting invitation process for:", userData.email)

    // Step 1: Check if invitation already exists
    const { data: existingInvitation, error: checkError } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", userData.email)
      .single()

    if (existingInvitation) {
      return { success: false, error: "An invitation for this email already exists" }
    }

    // Step 2: Check if user already exists in auth.users
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((user) => user.email === userData.email)

    if (existingUser) {
      return { success: false, error: "A user with this email already exists" }
    }

    console.log("✅ No existing user or invitation found")

    // Step 3: Create invitation record in user_invitations table
    const { data: invitationRecord, error: invitationError } = await supabase
      .from("user_invitations")
      .insert({
        email: userData.email,
        first_name: userData.first_name,
        surname: userData.surname,
        timezone: userData.timezone,
        bot_share_name: userData.bot_share_name,
        role: userData.role,
        invited_by: userData.invited_by,
      })
      .select()
      .single()

    if (invitationError) {
      console.error("❌ Failed to create invitation record:", invitationError)
      throw new Error(`Failed to create invitation record: ${invitationError.message}`)
    }

    console.log("✅ Invitation record created:", invitationRecord.id)

    // Step 4: Send Supabase invitation email using admin client
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(userData.email, {
      data: {
        first_name: userData.first_name,
        surname: userData.surname,
        timezone: userData.timezone,
        bot_share_name: userData.bot_share_name,
        role: userData.role,
        invited_by: userData.invited_by,
        invitation_id: invitationRecord.id, // Link to our tracking record
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?setup=true`,
    })

    if (inviteError) {
      console.error("❌ Supabase invitation error:", inviteError)

      // Clean up the invitation record if email sending failed
      await supabase.from("user_invitations").delete().eq("id", invitationRecord.id)

      return { success: false, error: `Failed to send invitation email: ${inviteError.message}` }
    }

    console.log("✅ Invitation email sent successfully")

    return {
      success: true,
      message: "Invitation email sent successfully! The user will receive an email with instructions to join.",
      isNewUser: true,
    }
  } catch (error: any) {
    console.error("❌ Error inviting user:", error)
    return { success: false, error: error.message || "Failed to send invitation" }
  }
}

// Get users with bot access
export async function getUsers() {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    const adminClient = getAdminClient()

    const { data: userProfiles, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        first_name,
        surname,
        timezone,
        bot_share_name,
        bot_users(role, is_active)
      `)
      .not("bot_share_name", "is", null)
      .order("first_name")

    if (error) throw error

    const transformedUsers = await Promise.all(
      (userProfiles || []).map(async (profile: any) => {
        try {
          const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id)
          return {
            id: profile.id,
            first_name: profile.first_name || "",
            surname: profile.surname || "",
            role: profile.bot_users?.[0]?.role || "member",
            timezone: profile.timezone || "Asia/Bangkok",
            bot_share_name: profile.bot_share_name,
            email: authUser?.user?.email || "Unknown",
            is_active: profile.bot_users?.[0]?.is_active || false,
          }
        } catch {
          return {
            id: profile.id,
            first_name: profile.first_name || "",
            surname: profile.surname || "",
            role: profile.bot_users?.[0]?.role || "member",
            timezone: profile.timezone || "Asia/Bangkok",
            bot_share_name: profile.bot_share_name,
            email: "Unknown",
            is_active: profile.bot_users?.[0]?.is_active || false,
          }
        }
      }),
    )

    return { success: true, users: transformedUsers }
  } catch (error: any) {
    console.error("Error getting users:", error)
    return { success: false, error: error.message, users: [] }
  }
}

// Get pending invitations
export async function getInvitations() {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { data: invitations, error } = await supabase
      .from("user_invitations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return { success: true, invitations }
  } catch (error: any) {
    console.error("Error getting invitations:", error)
    return { success: false, error: error.message, invitations: [] }
  }
}

// Update user
export async function updateUser(
  userId: string,
  userData: {
    first_name: string
    surname: string
    role: string
    timezone: string
    bot_share_name: string
  },
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        first_name: userData.first_name,
        surname: userData.surname,
        timezone: userData.timezone,
        bot_share_name: userData.bot_share_name,
      })
      .eq("id", userId)

    if (profileError) throw profileError

    const { error: roleError } = await supabase.from("bot_users").update({ role: userData.role }).eq("id", userId)

    if (roleError) throw roleError

    return { success: true }
  } catch (error: any) {
    console.error("Error updating user:", error)
    return { success: false, error: error.message }
  }
}

// Remove user access
export async function removeUserAccess(userId: string) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { error } = await supabase.from("user_profiles").update({ bot_share_name: null }).eq("id", userId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error removing user access:", error)
    return { success: false, error: error.message }
  }
}

// Delete invitation
export async function deleteInvitation(invitationId: string) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    const { error } = await supabase.from("user_invitations").delete().eq("id", invitationId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting invitation:", error)
    return { success: false, error: error.message }
  }
}
