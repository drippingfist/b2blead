"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, X, Users, Trash2, UserPlus, Settings, PlusCircle } from "lucide-react"
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
import Loading from "@/components/loading"
import { DeleteUserModal } from "@/components/delete-user-modal"
import { useBotSelection } from "@/hooks/use-bot-selection"

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
  botAssignments?: Array<{
    bot_share_name: string
    role: string
    is_active: boolean
  }>
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

export default function SettingsPage({
  searchParams,
}: {
  searchParams: { bot?: string }
}) {
  const router = useRouter()
  const { selectedBot, isSelectionLoaded } = useBotSelection()
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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(["", "", ""])

  const [botSettings, setBotSettings] = useState<{
    bot_share_name: string
    client_email: string
    transcript_email: string
    callback_email: string
    groq_suggested_questions: string
  }>({
    bot_share_name: "",
    client_email: "",
    transcript_email: "monthly",
    callback_email: "monthly",
    groq_suggested_questions: "",
  })
  const [botSettingsLoading, setBotSettingsLoading] = useState(false)
  const [botSettingsSaving, setBotSettingsSaving] = useState(false)
  const [clientName, setClientName] = useState<string>("")
  const [editingEmail, setEditingEmail] = useState(false)

  // Load user data when bot selection is ready
  useEffect(() => {
    if (isSelectionLoaded && selectedBot) {
      loadUserData(selectedBot)
    } else if (isSelectionLoaded) {
      setLoading(false)
    }
  }, [selectedBot, isSelectionLoaded])

  const loadUserData = async (botShareName: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log("⚙️ Settings Page: Starting data load...")
      const startTime = Date.now()

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
          getUsers(botShareName),

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
        botUser = botUsers.find((bu: any) => bu.bot_share_name === botShareName) || botUsers[0]
      }

      // Get bot details and set initial state
      let userTimezone = "Asia/Bangkok"
      let clientNameValue = ""
      let botSettingsValue = {
        bot_share_name: "",
        client_email: "",
        transcript_email: "monthly",
        callback_email: "monthly",
        groq_suggested_questions: "",
      }

      if (botUser?.bot_share_name) {
        console.log("⚙️ Settings Page: Loading bot details for:", botUser.bot_share_name)

        const { data: bot, error: botError } = await supabase
          .from("bots")
          .select("timezone, client_name, client_email, transcript_email, callback_email, groq_suggested_questions")
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
              transcript_email: bot.transcript_email || "monthly",
              callback_email: bot.callback_email || "monthly",
              groq_suggested_questions: bot.groq_suggested_questions || "",
            }
          }
          botSettingsValue.groq_suggested_questions = bot.groq_suggested_questions || ""
        }

        // Parse questions from the text blob
        const rawQuestions = bot.groq_suggested_questions || ""
        const questions = rawQuestions
          .split("\n")
          .map((q) => q.trim())
          .filter((q) => q !== "")
          .map((q) => q.replace(/^\d+\.\s*/, "")) // Remove "1. ", "2. ", etc.

        // Ensure there are at least 3 fields, even if empty
        while (questions.length < 3) {
          questions.push("")
        }
        setSuggestedQuestions(questions)
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

      // Process users result - show users for the selected bot only
      if (usersResult.status === "fulfilled" && usersResult.value.success) {
        // Filter users to only show those with access to the selected bot
        const botUsers = usersResult.value.users.filter(
          (user: any) => user.role !== "superadmin" && user.bot_share_name === botShareName,
        )
        setUsers(botUsers)
      }

      // Process invitations result - show invitations for the selected bot only
      if (invitationsResult.status === "fulfilled" && invitationsResult.value.success) {
        // Filter invitations to only show those for the selected bot
        const botInvitations = invitationsResult.value.invitations.filter(
          (invitation: any) => invitation.bot_share_name === botShareName,
        )
        setInvitedUsers(botInvitations)
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

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const result = await getUsers() // Get all users first

      if (result.success) {
        // Filter to only show users for the selected bot
        const botUsers = result.users.filter(
          (user) => user.role !== "superadmin" && user.bot_share_name === selectedBot,
        )
        setUsers(botUsers)
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
        // Filter invitations to only show those for the selected bot
        const botInvitations = result.invitations.filter((invitation: any) => invitation.bot_share_name === selectedBot)
        setInvitedUsers(botInvitations)
      } else {
        console.error("Error loading invitations:", result.error)
      }
    } catch (err: any) {
      console.error("Error loading invited users:", err)
    }
  }

  const handleTranscriptChange = (value: string) => {
    setBotSettings((prev) => ({ ...prev, transcript_email: value }))
    if (success) setSuccess(false)
  }

  const handleCallbackChange = (value: string) => {
    setBotSettings((prev) => ({ ...prev, callback_email: value }))
    if (success) setSuccess(false)
  }

  const handleSaveBotSettings = async () => {
    try {
      setBotSettingsSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from("bots")
        .update({
          client_email: botSettings.client_email,
          transcript_email: botSettings.transcript_email,
          callback_email: botSettings.callback_email,
        })
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

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...suggestedQuestions]
    newQuestions[index] = value
    setSuggestedQuestions(newQuestions)
    if (success) setSuccess(false)
  }

  const addQuestionField = () => {
    setSuggestedQuestions([...suggestedQuestions, ""])
  }

  const removeQuestionField = (index: number) => {
    // Prevent removing below the minimum of 3 fields
    if (suggestedQuestions.length > 3) {
      const newQuestions = suggestedQuestions.filter((_, i) => i !== index)
      setSuggestedQuestions(newQuestions)
    }
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

      const suggestedQuestionsBlob = suggestedQuestions
        .filter((q) => q.trim() !== "")
        .map((q, index) => `${index + 1}. ${q.trim()}`)
        .join("\n")

      if (selectedBot) {
        const { error: botUpdateError } = await supabase
          .from("bots")
          .update({
            timezone: userData.timezone,
            transcript_email: botSettings.transcript_email,
            callback_email: botSettings.callback_email,
            groq_suggested_questions: suggestedQuestionsBlob,
          })
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
            .update({
              timezone: userData.timezone,
              transcript_email: botSettings.transcript_email,
              callback_email: botSettings.callback_email,
              groq_suggested_questions: suggestedQuestionsBlob,
            })
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
    } finally {
      setUserToDelete(null)
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

  const handleBotSelection = (botShareName: string | null) => {
    if (botShareName) {
      loadUserData(botShareName)
    }
  }

  // Show simple message if no bot is selected (All Bots)
  if (!selectedBot) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full">
        <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm max-w-md w-full text-center">
          <Settings className="h-12 w-12 text-[#038a71] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Select a Bot</h1>
          <p className="text-[#616161] mb-6">Please select a bot from the dropdown menu in the sidebar.</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Show loading screen while initial data loads
  if (loading || !isSelectionLoaded) {
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
              <h3 className="text-md font-medium text-[#212121]">Chat Transcripts</h3>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="chat-never"
                    name="chat-transcripts"
                    value="never"
                    checked={botSettings.transcript_email === "never"}
                    onChange={() => handleTranscriptChange("never")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="chat-never" className="text-sm text-[#212121]">
                    Never
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="chat-daily"
                    name="chat-transcripts"
                    value="daily"
                    checked={botSettings.transcript_email === "daily"}
                    onChange={() => handleTranscriptChange("daily")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="chat-daily" className="text-sm text-[#212121]">
                    Daily
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="chat-weekly"
                    name="chat-transcripts"
                    value="weekly"
                    checked={botSettings.transcript_email === "weekly"}
                    onChange={() => handleTranscriptChange("weekly")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="chat-weekly" className="text-sm text-[#212121]">
                    Weekly
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="chat-monthly"
                    name="chat-transcripts"
                    value="monthly"
                    checked={botSettings.transcript_email === "monthly"}
                    onChange={() => handleTranscriptChange("monthly")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="chat-monthly" className="text-sm text-[#212121]">
                    Monthly
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-md font-medium text-[#212121]">Callbacks Report</h3>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="callbacks-never"
                    name="callbacks-report"
                    value="never"
                    checked={botSettings.callback_email === "never"}
                    onChange={() => handleCallbackChange("never")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="callbacks-never" className="text-sm text-[#212121]">
                    Never
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="callbacks-weekly"
                    name="callbacks-report"
                    value="weekly"
                    checked={botSettings.callback_email === "weekly"}
                    onChange={() => handleCallbackChange("weekly")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="callbacks-weekly" className="text-sm text-[#212121]">
                    Weekly
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="callbacks-monthly"
                    name="callbacks-report"
                    value="monthly"
                    checked={botSettings.callback_email === "monthly"}
                    onChange={() => handleCallbackChange("monthly")}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="callbacks-monthly" className="text-sm text-[#212121]">
                    Monthly
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

        {/* Permitted Suggested Questions Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Permitted Suggested Questions</h2>
          <p className="text-sm text-[#616161] mb-4">
            These questions will be suggested to the user during the chat. If no questions are added here, the AI will
            suggest any question it thinks is suitable.
          </p>
          <div className="space-y-4">
            {suggestedQuestions.map((question, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`question-${index}`}>Question {index + 1}</Label>
                  <Input
                    id={`question-${index}`}
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    placeholder={`Enter suggested question ${index + 1}`}
                    className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
                  />
                </div>
                {suggestedQuestions.length > 3 && (
                  <Button
                    onClick={() => removeQuestionField(index)}
                    variant="ghost"
                    size="icon"
                    className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button onClick={addQuestionField} variant="outline" className="flex items-center mt-4">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
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
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleAddUser}
                  disabled={addingUserLoading}
                  className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
                >
                  {addingUserLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Invite
                </Button>
              </div>
            </div>
          )}

          {/* Existing Users List */}

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#212121] mb-2">Active Users</h4>
            {users.map((user) => (
              <div key={user.id} className="p-4 border border-[#e0e0e0] rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-[#212121]">
                      {user.first_name} {user.surname}
                    </p>
                    <p className="text-xs text-[#616161]">{user.email}</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        <span className="font-medium">{user.bot_share_name}</span>
                        <span className="ml-1 text-blue-600">({user.role})</span>
                        {!user.is_active && <span className="ml-1 text-red-600">(inactive)</span>}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteUser(user.id)}
                    variant="outline"
                    size="sm"
                    className="bg-red-500 hover:bg-red-500/90 px-3"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {/* Pending Invitations */}
            {invitedUsers.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-[#212121] mb-2 mt-6">Pending Invitations</h4>
                {invitedUsers.map((invitation) => (
                  <div key={invitation.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-[#212121]">
                          {invitation.first_name} {invitation.surname}
                        </p>
                        <p className="text-xs text-[#616161]">{invitation.email}</p>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                            <span className="font-medium">{invitation.bot_share_name}</span>
                            <span className="ml-1 text-orange-600">({invitation.role})</span>
                            <span className="ml-1 text-orange-600">(pending)</span>
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        variant="outline"
                        size="sm"
                        className="bg-red-500 hover:bg-red-500/90 px-3"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add the Delete User Modal */}
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
