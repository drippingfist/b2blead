"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, X, Users, Trash2, UserPlus, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { timezones } from "@/lib/timezones"
import {
  inviteUser,
  getUsers,
  getInvitations,
  updateUser,
  deleteUser,
  deleteInvitation,
  getInvitableBots,
} from "@/lib/user-actions"
import { DeleteUserModal } from "@/components/delete-user-modal"
import Loading from "@/components/loading"

interface UserData {
  id: string
  first_name: string
  surname: string
  role: string
  timezone: string
  bot_share_name: string
  email?: string
  is_active?: boolean
  is_invited?: boolean
}

interface InvitedUser {
  id: string
  email: string
  first_name: string
  surname: string
  role: string
  timezone: string
  bot_share_name: string
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [addingUserLoading, setAddingUserLoading] = useState(false)
  const [newUser, setNewUser] = useState({
    email: "",
    first_name: "",
    surname: "",
    role: "member",
    timezone: "Asia/Bangkok",
    bot_share_name: "",
  })

  const [userData, setUserData] = useState({
    id: "",
    email: "",
    firstName: "",
    surname: "",
    timezone: "Asia/Bangkok",
  })

  const [availableBots, setAvailableBots] = useState<
    { bot_share_name: string; client_name: string; timezone: string }[]
  >([])

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null)

  const [botSettings, setBotSettings] = useState<{
    bot_share_name: string
    client_email: string
  }>({
    bot_share_name: "",
    client_email: "",
  })
  const [botSettingsLoading, setBotSettingsLoading] = useState(false)
  const [botSettingsSaving, setBotSettingsSaving] = useState(false)
  const [clientName, setClientName] = useState<string>("")
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState(false)

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)
        setError(null)

        console.log("⚙️ Settings Page: Starting data load...")
        const startTime = Date.now()

        // Check localStorage for selected bot first
        const storedBot = localStorage.getItem("selectedBot")
        console.log("⚙️ Settings Page: Retrieved bot from localStorage:", storedBot)
        setSelectedBot(storedBot)

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error(userError?.message || "Failed to load user data")
        }

        console.log("⚙️ Settings Page: Got user, starting parallel queries...")

        // Run all queries in parallel for faster loading
        const [profileResult, botUsersResult, availableBotsResult, usersResult, invitationsResult] =
          await Promise.allSettled([
            // Get user profile
            supabase
              .from("user_profiles")
              .select("first_name, surname")
              .eq("id", user.id)
              .single(),

            // Get user's bot access
            supabase
              .from("bot_users")
              .select("bot_share_name, role")
              .eq("user_id", user.id)
              .eq("is_active", true),

            // Get available bots
            getInvitableBots(),

            // Get users
            getUsers(storedBot),

            // Get invitations
            getInvitations(),
          ])

        // Process profile result
        let profile = null
        if (profileResult.status === "fulfilled" && !profileResult.value.error) {
          profile = profileResult.value.data
        }

        // Process bot users result
        let botUsers = []
        if (botUsersResult.status === "fulfilled" && !botUsersResult.value.error) {
          botUsers = botUsersResult.value.data || []
        }

        // Find the appropriate bot user
        let botUser = null
        if (botUsers.length > 0) {
          if (storedBot) {
            botUser = botUsers.find((bu: any) => bu.bot_share_name === storedBot) || botUsers[0]
          } else {
            botUser = botUsers[0]
          }
        }

        // Get bot details and set initial state
        let userTimezone = "Asia/Bangkok"
        let clientNameValue = ""
        let botSettingsValue = { bot_share_name: "", client_email: "" }

        if (botUser?.bot_share_name) {
          console.log("⚙️ Settings Page: Loading bot details for:", botUser.bot_share_name)

          const { data: bot, error: botError } = await supabase
            .from("bots")
            .select("timezone, client_name, client_email")
            .eq("bot_share_name", botUser.bot_share_name)
            .single()

          if (!botError && bot) {
            userTimezone = bot.timezone || "Asia/Bangkok"
            clientNameValue = bot.client_name || ""

            // Only load bot settings for admins and superadmins
            if (botUser.role === "admin" || botUser.role === "superadmin") {
              botSettingsValue = {
                bot_share_name: botUser.bot_share_name,
                client_email: bot.client_email || "",
              }
            }
          }
        }

        // Set all state at once
        setUserData({
          id: user.id,
          email: user.email || "",
          firstName: profile?.first_name || "",
          surname: profile?.surname || "",
          timezone: userTimezone,
        })

        setClientName(clientNameValue)
        setBotSettings(botSettingsValue)

        // Process available bots result
        if (availableBotsResult.status === "fulfilled" && availableBotsResult.value.success) {
          setAvailableBots(availableBotsResult.value.bots || [])
        }

        // Process users result
        if (usersResult.status === "fulfilled" && usersResult.value.success) {
          setUsers(usersResult.value.users.filter((user: any) => user.role !== "superadmin"))
        }

        // Process invitations result
        if (invitationsResult.status === "fulfilled" && invitationsResult.value.success) {
          setInvitedUsers(invitationsResult.value.invitations || [])
        }

        const endTime = Date.now()
        console.log(`⚙️ Settings Page: Data load completed in ${endTime - startTime}ms`)
      } catch (err: any) {
        console.error("Error loading user data:", err)
        setError(err.message || "Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()

    // Listen for bot selection changes
    const handleBotChange = (event: CustomEvent) => {
      const newBot = event.detail
      console.log("⚙️ Settings Page: Bot changed to:", newBot)
      setSelectedBot(newBot)
      // Reload data with new bot
      loadUserData()
    }

    window.addEventListener("botSelectionChanged", handleBotChange as EventListener)

    return () => {
      window.removeEventListener("botSelectionChanged", handleBotChange as EventListener)
    }
  }, []) // Remove selectedBot dependency to prevent infinite loops

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const result = await getUsers(selectedBot)

      if (result.success) {
        setUsers(result.users.filter((user) => user.role !== "superadmin"))
      } else {
        setError(result.error || "Failed to load users")
      }
    } catch (err: any) {
      console.error("Error loading users:", err)
      setError("Failed to load users")
    } finally {
      setUsersLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const result = await getInvitations()

      if (result.success) {
        setInvitedUsers(result.invitations || [])
      } else {
        console.error("Error loading invitations:", result.error)
      }
    } catch (err: any) {
      console.error("Error loading invited users:", err)
    }
  }

  const handleSaveBotSettings = async () => {
    try {
      setBotSettingsSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from("bots")
        .update({ client_email: botSettings.client_email })
        .eq("bot_share_name", botSettings.bot_share_name)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setEditingEmail(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error("Error saving bot settings:", err)
      setError(err.message || "Failed to save bot settings")
    } finally {
      setBotSettingsSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (success) setSuccess(false)
  }

  const handleUserEdit = (userId: string, field: string, value: string) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, [field]: value } : user)))
  }

  const handleNewUserChange = (field: string, value: string) => {
    setNewUser((prev) => ({ ...prev, [field]: value }))
  }

  const handleCancel = () => {
    router.push("/dashboard")
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Update user profile
      const { error: updateError } = await supabase.from("user_profiles").upsert({
        id: userData.id,
        first_name: userData.firstName,
        surname: userData.surname,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Update timezone only for the currently selected bot
      if (selectedBot) {
        const { error: botUpdateError } = await supabase
          .from("bots")
          .update({ timezone: userData.timezone })
          .eq("bot_share_name", selectedBot)

        if (botUpdateError) {
          throw new Error(botUpdateError.message)
        }
      } else {
        // Fallback: update timezone for all bots the user has access to
        const { data: userBots, error: userBotsError } = await supabase
          .from("bot_users")
          .select("bot_share_name")
          .eq("user_id", userData.id)

        if (userBotsError) {
          throw new Error(userBotsError.message)
        }

        if (userBots && userBots.length > 0) {
          const botShareNames = userBots.map((bot) => bot.bot_share_name)

          const { error: botsUpdateError } = await supabase
            .from("bots")
            .update({ timezone: userData.timezone })
            .in("bot_share_name", botShareNames)

          if (botsUpdateError) {
            throw new Error(botsUpdateError.message)
          }
        }
      }

      setSuccess(true)
    } catch (err: any) {
      console.error("Error saving user data:", err)
      setError(err.message || "Failed to save user data")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUser = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      const result = await updateUser(userId, {
        first_name: user.first_name,
        surname: user.surname,
        role: user.role,
        bot_share_name: user.bot_share_name,
      })

      if (result.success) {
        setEditingUser(null)
        setSuccess(true)
      } else {
        setError(result.error || "Failed to save user changes")
      }
    } catch (err: any) {
      console.error("Error saving user:", err)
      setError("Failed to save user changes")
    }
  }

  const handleAddUser = async () => {
    try {
      if (!newUser.email || !newUser.bot_share_name) {
        setError("Email and bot selection are required")
        return
      }

      const selectedBotData = availableBots.find((bot) => bot.bot_share_name === newUser.bot_share_name)
      if (!selectedBotData) {
        setError("Invalid bot selection. Please choose from the available bots.")
        return
      }

      setAddingUserLoading(true)
      setError(null)

      const result = await inviteUser({
        ...newUser,
        invited_by: userData.id,
      })

      if (result.success) {
        setNewUser({
          email: "",
          first_name: "",
          surname: "",
          role: "member",
          timezone: "Asia/Bangkok",
          bot_share_name: "",
        })
        setAddingUser(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)

        await Promise.all([loadUsers(), loadInvitations()])
      } else {
        setError(result.error || "Failed to add user")
      }
    } catch (err: any) {
      console.error("Error adding user:", err)
      setError("Failed to add user: " + (err.message || "Unknown error"))
    } finally {
      setAddingUserLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setUserToDelete({
      id: userId,
      name: `${user.first_name} ${user.surname}`.trim() || "Unknown User",
      email: user.email || "Unknown Email",
    })
    setDeleteModalOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const result = await deleteUser(userToDelete.id)

      if (result.success) {
        await loadUsers()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Failed to delete user")
      }
    } catch (err: any) {
      console.error("Error deleting user:", err)
      setError("Failed to delete user")
    } finally {
      setUserToDelete(null)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      if (!confirm("Are you sure you want to delete this invitation?")) return

      const result = await deleteInvitation(invitationId)

      if (result.success) {
        await loadInvitations()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Failed to delete invitation")
      }
    } catch (err: any) {
      console.error("Error deleting invitation:", err)
      setError("Failed to delete invitation")
    }
  }

  // Show loading screen while initial data loads
  if (loading) {
    return <Loading message="Loading settings..." />
  }

  return (
    <div className="p-4 md:p-8">
      {clientName && (
        <div className="mb-2">
          <p className="text-sm text-[#616161] font-medium">{clientName}</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Settings</h1>
          <p className="text-[#616161]">Manage your client-specific settings and preferences.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Your settings have been saved successfully.
        </div>
      )}

      <div className="w-[60%] space-y-6">
        {/* Email Settings Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Email Settings</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="clientEmail"
                  type="email"
                  value={botSettings.client_email}
                  onChange={(e) => setBotSettings((prev) => ({ ...prev, client_email: e.target.value }))}
                  placeholder="Enter client email address"
                  disabled={botSettingsLoading || botSettingsSaving || !editingEmail}
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] flex-1"
                />
                {!editingEmail ? (
                  <Button
                    onClick={() => setEditingEmail(true)}
                    variant="outline"
                    size="sm"
                    disabled={botSettingsLoading}
                    className="px-3"
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      onClick={handleSaveBotSettings}
                      disabled={botSettingsSaving}
                      size="sm"
                      className="bg-[#038a71] hover:bg-[#038a71]/90 px-3"
                    >
                      {botSettingsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingEmail(false)
                        // Reset to original value by reloading bot settings
                        if (selectedBot) {
                          supabase
                            .from("bots")
                            .select("client_email")
                            .eq("bot_share_name", selectedBot)
                            .single()
                            .then(({ data }) => {
                              if (data) {
                                setBotSettings((prev) => ({ ...prev, client_email: data.client_email || "" }))
                              }
                            })
                        }
                      }}
                      variant="outline"
                      size="sm"
                      disabled={botSettingsSaving}
                      className="px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-md font-medium text-[#212121]">Email frequency</h3>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="daily-summary" className="rounded border-gray-300" />
                  <label htmlFor="daily-summary" className="text-sm text-[#212121]">
                    Daily summary
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="weekly-report" className="rounded border-gray-300" />
                  <label htmlFor="weekly-report" className="text-sm text-[#212121]">
                    Weekly report
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="monthly-analytics" className="rounded border-gray-300" />
                  <label htmlFor="monthly-analytics" className="text-sm text-[#212121]">
                    Monthly analytics
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="urgent-alerts" className="rounded border-gray-300" defaultChecked />
                  <label htmlFor="urgent-alerts" className="text-sm text-[#212121]">
                    Urgent alerts
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Timezone Settings</h2>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={userData.timezone}
              onValueChange={(value) => handleChange("timezone", value)}
              disabled={loading || saving}
            >
              <SelectTrigger className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]">
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((timezone) => (
                  <SelectItem key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#616161]">
              {selectedBot
                ? `This will update the timezone for ${clientName || selectedBot}.`
                : "This will update the timezone for the selected AI."}
            </p>
          </div>
        </div>

        {/* Users Management Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#212121] flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Management
            </h2>
            <Button
              onClick={() => setAddingUser(true)}
              className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Add User Form */}
          {addingUser && (
            <div className="mb-6 p-4 border border-[#e0e0e0] rounded-lg bg-gray-50">
              <h3 className="text-sm font-medium text-[#212121] mb-3">Invite New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input
                    value={newUser.email}
                    onChange={(e) => handleNewUserChange("email", e.target.value)}
                    placeholder="user@example.com"
                    className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bot Access *</Label>
                  <Select
                    value={newUser.bot_share_name}
                    onValueChange={(value) => handleNewUserChange("bot_share_name", value)}
                  >
                    <SelectTrigger className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8">
                      <SelectValue placeholder="Select bot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBots.map((bot) => (
                        <SelectItem key={bot.bot_share_name} value={bot.bot_share_name}>
                          {bot.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={newUser.first_name}
                    onChange={(e) => handleNewUserChange("first_name", e.target.value)}
                    placeholder="John"
                    className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Surname</Label>
                  <Input
                    value={newUser.surname}
                    onChange={(e) => handleNewUserChange("surname", e.target.value)}
                    placeholder="Doe"
                    className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => handleNewUserChange("role", value)}>
                    <SelectTrigger className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Button
                  onClick={handleAddUser}
                  disabled={addingUserLoading}
                  className="bg-[#038a71] hover:bg-[#038a71]/90"
                  size="sm"
                >
                  {addingUserLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Send Invitation
                </Button>
                <Button onClick={() => setAddingUser(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#038a71]" />
              <span className="ml-2 text-[#616161]">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Users List */}
              <div>
                <h3 className="text-sm font-medium text-[#212121] mb-3">Active Users</h3>
                <div className="space-y-2">
                  {users.length === 0 ? (
                    <div className="text-center py-4 text-[#616161] bg-gray-50 rounded-lg">No active users found.</div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="p-4 border border-[#e0e0e0] rounded-lg">
                        {editingUser === user.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">First Name</Label>
                              <Input
                                value={user.first_name}
                                onChange={(e) => handleUserEdit(user.id, "first_name", e.target.value)}
                                className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Surname</Label>
                              <Input
                                value={user.surname}
                                onChange={(e) => handleUserEdit(user.id, "surname", e.target.value)}
                                className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Role</Label>
                              <Select value={user.role} onChange={(value) => handleUserEdit(user.id, "role", value)}>
                                <SelectTrigger className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end space-x-2 md:col-span-3">
                              <Button
                                onClick={() => handleSaveUser(user.id)}
                                className="bg-[#038a71] hover:bg-[#038a71]/90"
                                size="sm"
                              >
                                Save
                              </Button>
                              <Button onClick={() => setEditingUser(null)} variant="outline" size="sm">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              <div>
                                <p className="text-sm font-medium text-[#212121]">
                                  {user.first_name} {user.surname}
                                </p>
                                <p className="text-xs text-[#616161]">{user.email}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[#616161] uppercase tracking-wider">Role</p>
                                <p className="text-sm text-[#212121] capitalize">{user.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button onClick={() => setEditingUser(user.id)} variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteUser(user.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Invited Users List */}
              {invitedUsers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-[#212121] mb-3">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitedUsers.map((invitation) => (
                      <div key={invitation.id} className="p-4 border border-[#e0e0e0] rounded-lg bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                            <div>
                              <p className="text-sm font-medium text-[#212121]">
                                {invitation.first_name} {invitation.surname}
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  Pending
                                </span>
                              </p>
                              <p className="text-xs text-[#616161]">{invitation.email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#616161] uppercase tracking-wider">Role</p>
                              <p className="text-sm text-[#212121] capitalize">{invitation.role}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#616161] uppercase tracking-wider">Invited</p>
                              <p className="text-sm text-[#212121]">
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={confirmDeleteUser}
        userName={userToDelete?.name || ""}
        userEmail={userToDelete?.email || ""}
      />
    </div>
  )
}
