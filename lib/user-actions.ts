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

// Get bots that the current user can invite others to
export async function getInvitableBots() {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.id) {
      return { success: false, error: "User not authenticated", bots: [] }
    }

    // Get user's bot assignments
    const { data: userBots, error: userBotsError } = await supabase
      .from("bot_users")
      .select("bot_share_name, role")
      .eq("id", user.id)
      .eq("is_active", true)

    if (userBotsError) {
      throw userBotsError
    }

    if (!userBots || userBots.length === 0) {
      return { success: false, error: "You don't have access to any bots", bots: [] }
    }

    // Check if user is superadmin (can invite to all bots)
    const isSuperAdmin = userBots.some((bot) => bot.role === "superadmin")

    let botShareNames: string[]

    if (isSuperAdmin) {
      // Superadmin can invite to all bots
      const { data: allBots, error: allBotsError } = await supabase
        .from("bots")
        .select("bot_share_name")
        .not("bot_share_name", "is", null)

      if (allBotsError) throw allBotsError
      botShareNames = allBots?.map((bot) => bot.bot_share_name).filter(Boolean) || []
    } else {
      // Regular admin/member can only invite to their assigned bots
      botShareNames = userBots.map((bot) => bot.bot_share_name).filter(Boolean)
    }

    if (botShareNames.length === 0) {
      return { success: false, error: "No bots available for invitation", bots: [] }
    }

    // Get bot details
    const { data: bots, error: botsError } = await supabase
      .from("bots")
      .select("bot_share_name, client_name, timezone")
      .in("bot_share_name", botShareNames)
      .order("client_name")

    if (botsError) throw botsError

    return { success: true, bots: bots || [] }
  } catch (error: any) {
    console.error("Error getting invitable bots:", error)
    return { success: false, error: error.message, bots: [] }
  }
}

// Invite a new user using Supabase's built-in invitation system
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

    // Verify the inviting user has access to the bot they're trying to invite to
    const { data: inviterBots, error: inviterBotsError } = await supabase
      .from("bot_users")
      .select("bot_share_name, role")
      .eq("id", userData.invited_by)
      .eq("is_active", true)

    if (inviterBotsError) {
      throw inviterBotsError
    }

    const isSuperAdmin = inviterBots?.some((bot) => bot.role === "superadmin")
    const hasAccessToBot = inviterBots?.some((bot) => bot.bot_share_name === userData.bot_share_name)

    if (!isSuperAdmin && !hasAccessToBot) {
      return { success: false, error: "You don't have permission to invite users to this bot" }
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((user) => user.email === userData.email)

    if (existingUser) {
      return { success: false, error: "A user with this email already exists" }
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", userData.email)
      .single()

    if (invitationCheckError && invitationCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" which is what we want
      throw invitationCheckError
    }

    if (existingInvitation) {
      return { success: false, error: "An invitation has already been sent to this email address" }
    }

    console.log("✅ No existing user or invitation found")

    // Send Supabase invitation email using inviteUserByEmail
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(userData.email, {
      data: {
        first_name: userData.first_name,
        surname: userData.surname,
        bot_share_name: userData.bot_share_name,
        role: userData.role,
        invited_by: userData.invited_by,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/accept-invite?type=invite`,
    })

    if (inviteError) {
      console.error("❌ Supabase invitation error:", inviteError)
      return { success: false, error: `Failed to send invitation email: ${inviteError.message}` }
    }

    console.log("✅ Invitation email sent successfully")

    // Record the invitation in user_invitations table
    const { error: recordError } = await supabase.from("user_invitations").insert({
      email: userData.email,
      first_name: userData.first_name,
      surname: userData.surname,
      role: userData.role,
      bot_share_name: userData.bot_share_name,
      invited_by: userData.invited_by,
    })

    if (recordError) {
      console.error("❌ Error recording invitation:", recordError)
      // Don't fail the whole process if recording fails, but log it
    } else {
      console.log("✅ Invitation recorded in database")
    }

    return {
      success: true,
      message:
        "Invitation email sent successfully! The user will receive an email with instructions to set their password and join.",
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

    // Step 1: Get all users from auth.users using admin client
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      throw authError
    }

    // Step 2: Get user profiles and bot access data
    const { data: userProfiles, error: profilesError } = await supabase.from("user_profiles").select("*")

    if (profilesError) {
      throw profilesError
    }

    const { data: botUsers, error: botUsersError } = await supabase.from("bot_users").select("*")

    if (botUsersError) {
      throw botUsersError
    }

    // Step 3: Create a map of profiles and bot users by user ID for quick lookup
    const profilesMap = new Map()
    userProfiles?.forEach((profile) => {
      profilesMap.set(profile.id, profile)
    })

    const botUsersMap = new Map()
    botUsers?.forEach((botUser) => {
      botUsersMap.set(botUser.id, botUser)
    })

    // Step 4: Combine the data for each user
    const transformedUsers = authUsers.users
      .filter((user) => !user.is_super_admin) // Filter out super admins if needed
      .map((user) => {
        const profile = profilesMap.get(user.id)
        const botUser = botUsersMap.get(user.id)

        // Filter out superadmins based on role in bot_users table
        if (botUser?.role === "superadmin") {
          return null
        }

        // Only include users who have bot access (either in user_profiles or bot_users)
        if (!profile?.bot_share_name && !botUser?.bot_share_name) {
          return null
        }

        return {
          id: user.id,
          email: user.email || "Unknown",
          first_name: profile?.first_name || "",
          surname: profile?.surname || "",
          role: botUser?.role || "member",
          timezone: profile?.timezone || "Asia/Bangkok",
          bot_share_name: profile?.bot_share_name || botUser?.bot_share_name || "",
          is_active: botUser?.is_active || false,
        }
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""))

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
    const adminClient = getAdminClient()

    // Step 1: Get the invitation record to find the email
    const { data: invitation, error: getError } = await supabase
      .from("user_invitations")
      .select("email")
      .eq("id", invitationId)
      .single()

    if (getError || !invitation) {
      throw new Error("Invitation not found")
    }

    console.log("🗑️ Deleting invitation for email:", invitation.email)

    // Step 2: Find and delete the user from auth.users if they exist
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const pendingUser = authUsers?.users?.find((user) => user.email === invitation.email)

    if (pendingUser) {
      console.log("🗑️ Found pending user in auth, deleting:", pendingUser.id)

      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(pendingUser.id)

      if (deleteUserError) {
        console.error("❌ Error deleting user from auth:", deleteUserError)
        // Continue anyway - we still want to delete the invitation record
      } else {
        console.log("✅ User deleted from auth.users")
      }
    }

    // Step 3: Delete the invitation record
    const { error: deleteInvitationError } = await supabase.from("user_invitations").delete().eq("id", invitationId)

    if (deleteInvitationError) throw deleteInvitationError

    console.log("✅ Invitation record deleted")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting invitation:", error)
    return { success: false, error: error.message }
  }
}
