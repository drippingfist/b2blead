"use client"
import { useState, useEffect, useCallback } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, Settings, PlusCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { timezones } from "@/lib/timezones"
import Loading from "@/components/loading"
import { useBotSelection } from "@/hooks/use-bot-selection"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteUserModal } from "@/components/delete-user-modal"
import {
  getUsers,
  getInvitations,
  inviteUser,
  deleteUser,
  deleteInvitation,
  getInvitableBots,
} from "@/lib/user-actions"
import { Users, UserPlus, Trash, Send } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const { selectedBot, isSelectionLoaded } = useBotSelection()
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // --- State for Bot Settings ---
  const [botSettings, setBotSettings] = useState({
    client_email: "",
    transcript_email: "monthly",
    callback_email: "monthly",
    timezone: "Asia/Bangkok",
    groq_suggested_questions: ["", "", ""],
  })

  // State to hold the original data for cancellation
  const [initialBotSettings, setInitialBotSettings] = useState(botSettings)

  const [clientName, setClientName] = useState<string>("")

  // User Management State
  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [invitableBots, setInvitableBots] = useState<Array<{ bot_share_name: string; client_name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Modal states for User Management
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any | null>(null)
  const [invitationToDelete, setInvitationToDelete] = useState<any | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states for inviting user
  const [inviteForm, setInviteForm] = useState({
    email: "",
    first_name: "",
    surname: "",
    role: "member",
    bot_share_name: selectedBot || "",
  })

  // Load data when bot selection is ready
  useEffect(() => {
    if (isSelectionLoaded && selectedBot) {
      loadBotData(selectedBot)
    } else if (isSelectionLoaded) {
      setLoading(false)
    }
  }, [selectedBot, isSelectionLoaded])

  const loadBotData = async (botShareName: string) => {
    try {
      setLoading(true)
      setError(null)
      const { data: bot, error: botError } = await supabase
        .from("bots")
        .select("timezone, client_name, client_email, transcript_email, callback_email, groq_suggested_questions")
        .eq("bot_share_name", botShareName)
        .single()

      if (botError) throw botError
      if (!bot) throw new Error("Bot not found.")

      const rawQuestions = bot.groq_suggested_questions || ""
      const questions = rawQuestions
        .split("\n")
        .map((q) => q.replace(/^\d+\.\s*/, "").trim())
        .filter((q) => q)
      while (questions.length < 3) questions.push("")

      const loadedSettings = {
        client_email: bot.client_email || "",
        transcript_email: bot.transcript_email || "monthly",
        callback_email: bot.callback_email || "monthly",
        timezone: bot.timezone || "Asia/Bangkok",
        groq_suggested_questions: questions,
      }

      setBotSettings(loadedSettings)
      setInitialBotSettings(loadedSettings)
      setClientName(bot.client_name || "")
    } catch (err: any) {
      setError(err.message || "Failed to load bot data")
    } finally {
      setLoading(false)
    }
  }

  // Fetch current user ID and superadmin status
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Check superadmin status
        const { data: superAdmin } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()
        setIsSuperAdmin(!!superAdmin)
      }
    }
    fetchCurrentUserId()
  }, [])

  // Load users and invitations
  const loadUsersAndInvitations = useCallback(async () => {
    if (!isSelectionLoaded) return

    if (!selectedBot && !isSuperAdmin) {
      setUsers([])
      setInvitations([])
      setLoadingUsers(false)
      setLoadingInvitations(false)
      return
    }

    setLoadingUsers(true)
    setLoadingInvitations(true)
    setError(null)

    try {
      const usersResult = await getUsers(selectedBot)
      if (usersResult.success) {
        setUsers(usersResult.users)
      } else {
        setError((prev) => (prev ? `${prev}\n${usersResult.error}` : usersResult.error || "Failed to load users"))
        setUsers([])
      }

      const invitesResult = await getInvitations()
      if (invitesResult.success) {
        if (selectedBot && !isSuperAdmin) {
          setInvitations(invitesResult.invitations.filter((inv) => inv.bot_share_name === selectedBot))
        } else if (isSuperAdmin && selectedBot) {
          setInvitations(invitesResult.invitations.filter((inv) => inv.bot_share_name === selectedBot))
        } else {
          setInvitations(invitesResult.invitations)
        }
      } else {
        setError((prev) =>
          prev ? `${prev}\n${invitesResult.error}` : invitesResult.error || "Failed to load invitations",
        )
        setInvitations([])
      }
    } catch (e: any) {
      setError(e.message || "Error loading user management data")
      setUsers([])
      setInvitations([])
    } finally {
      setLoadingUsers(false)
      setLoadingInvitations(false)
    }
  }, [selectedBot, isSelectionLoaded, isSuperAdmin])

  useEffect(() => {
    loadUsersAndInvitations()
  }, [loadUsersAndInvitations])

  // Fetch invitable bots
  useEffect(() => {
    const fetchInvitableBotsData = async () => {
      const result = await getInvitableBots()
      if (result.success) {
        setInvitableBots(result.bots)
        if (selectedBot) {
          setInviteForm((prev) => ({ ...prev, bot_share_name: selectedBot }))
        } else if (result.bots.length === 1) {
          setInviteForm((prev) => ({ ...prev, bot_share_name: result.bots[0].bot_share_name }))
        } else if (result.bots.length > 0 && !selectedBot && isSuperAdmin) {
          setInviteForm((prev) => ({ ...prev, bot_share_name: result.bots[0].bot_share_name }))
        }
      }
    }
    if (isSelectionLoaded) {
      fetchInvitableBotsData()
    }
  }, [isSelectionLoaded, selectedBot, isSuperAdmin])

  // Handler functions
  const handleInviteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setInviteForm((prev) => ({ ...prev, [name]: value }))
  }

  const openInviteModal = () => {
    const defaultBotShareName = selectedBot || (invitableBots.length > 0 ? invitableBots[0].bot_share_name : "")
    setInviteForm({
      email: "",
      first_name: "",
      surname: "",
      role: "member",
      bot_share_name: defaultBotShareName,
    })
    setIsInviteModalOpen(true)
  }

  const openDeleteUserModal = (user: any) => {
    setUserToDelete({
      id: user.id,
      name: `${user.first_name || ""} ${user.surname || ""}`.trim() || user.email,
      email: user.email,
    })
    setDeleteModalOpen(true)
  }

  const openDeleteInvitationModal = (invitation: any) => {
    setInvitationToDelete(invitation)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      setError("Could not identify inviting user. Please refresh.")
      return
    }
    if (!inviteForm.bot_share_name) {
      setError("Please select a bot for the new user.")
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const invitePayload = {
      ...inviteForm,
      invited_by: currentUserId,
      timezone: botSettings.timezone || "Asia/Bangkok",
    }

    const result = await inviteUser(invitePayload)
    if (result.success) {
      setSuccess(result.message || "Invitation sent successfully!")
      setIsInviteModalOpen(false)
      loadUsersAndInvitations()
    } else {
      setError(result.error || "Failed to send invitation.")
    }
    setSaving(false)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    setSaving(true)
    const result = await deleteUser(userToDelete.id)
    if (result.success) {
      setSuccess("User deleted successfully!")
      loadUsersAndInvitations()
    } else {
      setError(result.error || "Failed to delete user.")
    }
    setUserToDelete(null)
    setDeleteModalOpen(false)
    setSaving(false)
  }

  const confirmDeleteInvitation = async () => {
    if (!invitationToDelete) return
    setSaving(true)
    const result = await deleteInvitation(invitationToDelete.id)
    if (result.success) {
      setSuccess("Invitation deleted successfully!")
      loadUsersAndInvitations()
    } else {
      setError(result.error || "Failed to delete invitation.")
    }
    setInvitationToDelete(null)
    setSaving(false)
  }

  const handleSavePanel = async (panelName: string, payload: any) => {
    if (!selectedBot) {
      console.error("❌ Save stopped: No bot is selected.")
      return
    }

    console.log(`[Save Triggered] for panel: ${panelName}`)
    console.log("-> Selected Bot:", selectedBot)
    console.log("-> Payload to be saved:", payload)

    setSavingSection(panelName)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.from("bots").update(payload).eq("bot_share_name", selectedBot)

      if (error) {
        throw error
      }

      setSuccess(`${panelName} settings saved successfully!`)

      // ✅ FIX: Re-fetch data from the database to ensure UI is in sync
      // This is better than manually updating state.
      await loadBotData(selectedBot)
    } catch (err: any) {
      console.error(`❌ FAILED to save ${panelName.toLowerCase()} settings:`, err)
      setError(`Failed to save ${panelName.toLowerCase()} settings: ${err.message}`)
    } finally {
      setSavingSection(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSaveEmailSettings = () => {
    handleSavePanel("Email", {
      client_email: botSettings.client_email,
      transcript_email: botSettings.transcript_email,
      callback_email: botSettings.callback_email,
    })
  }

  const handleSaveTimezone = () => {
    handleSavePanel("Timezone", { timezone: botSettings.timezone })
  }

  const handleSaveQuestions = () => {
    const suggestedQuestionsBlob = botSettings.groq_suggested_questions.filter((q) => q.trim() !== "").join("\n")
    handleSavePanel("Questions", { groq_suggested_questions: suggestedQuestionsBlob })
  }

  const handleCancelEmailSettings = () => {
    setBotSettings((prev) => ({
      ...prev,
      client_email: initialBotSettings.client_email,
      transcript_email: initialBotSettings.transcript_email,
      callback_email: initialBotSettings.callback_email,
    }))
  }

  const handleCancelTimezone = () => {
    setBotSettings((prev) => ({ ...prev, timezone: initialBotSettings.timezone }))
  }

  const handleCancelQuestions = () => {
    setBotSettings((prev) => ({ ...prev, groq_suggested_questions: [...initialBotSettings.groq_suggested_questions] }))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...botSettings.groq_suggested_questions]
    newQuestions[index] = value
    setBotSettings((prev) => ({ ...prev, groq_suggested_questions: newQuestions }))
  }

  const addQuestionField = () => {
    setBotSettings((prev) => ({ ...prev, groq_suggested_questions: [...prev.groq_suggested_questions, ""] }))
  }

  const removeQuestionField = (index: number) => {
    if (botSettings.groq_suggested_questions.length > 3) {
      const newQuestions = botSettings.groq_suggested_questions.filter((_, i) => i !== index)
      setBotSettings((prev) => ({ ...prev, groq_suggested_questions: newQuestions }))
    }
  }

  if (!selectedBot && isSelectionLoaded) {
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

  if (loading) return <Loading message="Loading settings..." />

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
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">{success}</div>
      )}

      <div className="w-[60%] space-y-6">
        {/* Email Settings Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Email Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={botSettings.client_email}
                onChange={(e) => setBotSettings((prev) => ({ ...prev, client_email: e.target.value }))}
                placeholder="Enter client email address"
                className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
              />
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, transcript_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, transcript_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, transcript_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, transcript_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, callback_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, callback_email: e.target.value }))}
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
                    onChange={(e) => setBotSettings((p) => ({ ...p, callback_email: e.target.value }))}
                  />
                  <label htmlFor="callbacks-monthly" className="text-sm text-[#212121]">
                    Monthly
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelEmailSettings} disabled={savingSection !== null}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmailSettings}
              disabled={savingSection !== null}
              className="bg-[#038a71] hover:bg-[#038a71]/90"
            >
              {savingSection === "Email" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* Timezone Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Timezone Settings</h2>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={botSettings.timezone}
              onValueChange={(value) => setBotSettings((prev) => ({ ...prev, timezone: value }))}
              disabled={loading || savingSection !== null}
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
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelTimezone} disabled={savingSection !== null}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTimezone}
              disabled={savingSection !== null}
              className="bg-[#038a71] hover:bg-[#038a71]/90"
            >
              {savingSection === "Timezone" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* User Management Section - Conditionally Rendered */}
        {(isSuperAdmin || selectedBot) && (
          <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Management
              </h2>
              {(selectedBot || (isSuperAdmin && invitableBots.length > 0)) && (
                <Button onClick={openInviteModal} className="bg-[#038a71] hover:bg-[#038a71]/90 text-sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              )}
            </div>

            <Tabs defaultValue="active-users">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="active-users">Active Users</TabsTrigger>
                <TabsTrigger value="pending-invitations">Pending Invitations</TabsTrigger>
              </TabsList>

              <TabsContent value="active-users">
                {loadingUsers ? (
                  <div className="text-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#038a71]" />
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          {isSuperAdmin && !selectedBot && <TableHead>Bot Access</TableHead>}
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.first_name} {user.surname}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="capitalize">{user.role}</TableCell>
                            {isSuperAdmin && !selectedBot && <TableCell>{user.bot_share_name || "N/A"}</TableCell>}
                            <TableCell>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteUserModal(user)}
                                title="Delete User"
                              >
                                <Trash className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-[#616161] text-center py-4">
                    No active users found
                    {selectedBot
                      ? ` for ${clientName || selectedBot}`
                      : isSuperAdmin
                        ? " matching filters"
                        : ". Select a bot to see users."}
                    .
                  </p>
                )}
              </TabsContent>

              <TabsContent value="pending-invitations">
                {loadingInvitations ? (
                  <div className="text-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#038a71]" />
                  </div>
                ) : invitations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Bot Access</TableHead>
                          <TableHead>Invited At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell>{invite.email}</TableCell>
                            <TableCell>
                              {invite.first_name} {invite.surname}
                            </TableCell>
                            <TableCell className="capitalize">{invite.role}</TableCell>
                            <TableCell>{invite.bot_share_name}</TableCell>
                            <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteInvitationModal(invite)}
                                title="Delete Invitation"
                              >
                                <Trash className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-[#616161] text-center py-4">
                    No pending invitations
                    {selectedBot
                      ? ` for ${clientName || selectedBot}`
                      : isSuperAdmin
                        ? ""
                        : ". Select a bot to see invitations."}
                    .
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Permitted Suggested Questions Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Permitted Suggested Questions</h2>
          <p className="text-sm text-[#616161] mb-4">
            These questions will be suggested to the user during the chat. If no questions are added here, the AI will
            suggest any question it thinks is suitable.
          </p>
          <div className="space-y-4">
            {botSettings.groq_suggested_questions.map((question, index) => (
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
                {botSettings.groq_suggested_questions.length > 3 && (
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
            <Button onClick={addQuestionField} variant="outline" className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelQuestions} disabled={savingSection !== null}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestions}
              disabled={savingSection !== null}
              className="bg-[#038a71] hover:bg-[#038a71]/90"
            >
              {savingSection === "Questions" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isInviteModalOpen && (
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInviteSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="invite-first_name" className="text-sm">
                  First Name
                </Label>
                <Input
                  id="invite-first_name"
                  name="first_name"
                  value={inviteForm.first_name}
                  onChange={handleInviteFormChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-surname" className="text-sm">
                  Surname
                </Label>
                <Input
                  id="invite-surname"
                  name="surname"
                  value={inviteForm.surname}
                  onChange={handleInviteFormChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-email" className="text-sm">
                  Email Address *
                </Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={handleInviteFormChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role" className="text-sm">
                  Role
                </Label>
                <Select
                  name="role"
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="superadmin">Superadmin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invite-bot_share_name" className="text-sm">
                  Assign to Bot *
                </Label>
                <Select
                  name="bot_share_name"
                  value={inviteForm.bot_share_name}
                  onValueChange={(value) => setInviteForm((prev) => ({ ...prev, bot_share_name: value }))}
                  disabled={!isSuperAdmin && !!selectedBot && invitableBots.length <= 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableBots.map((bot) => (
                      <SelectItem key={bot.bot_share_name} value={bot.bot_share_name}>
                        {bot.client_name || bot.bot_share_name}
                      </SelectItem>
                    ))}
                    {invitableBots.length === 0 && (
                      <div className="p-2 text-sm text-gray-500">No bots available to assign.</div>
                    )}
                  </SelectContent>
                </Select>
                {!isSuperAdmin && invitableBots.length === 1 && selectedBot && (
                  <p className="text-xs text-gray-500 mt-1">User will be assigned to {clientName || selectedBot}.</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={saving}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" className="bg-[#038a71] hover:bg-[#038a71]/90" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Modal Instance */}
      {deleteModalOpen && userToDelete && (
        <DeleteUserModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setUserToDelete(null)
          }}
          onConfirm={confirmDeleteUser}
          userName={userToDelete.name}
          userEmail={userToDelete.email}
        />
      )}

      {/* Delete Invitation Modal Instance */}
      {invitationToDelete && (
        <Dialog
          open={!!invitationToDelete}
          onOpenChange={(isOpen) => {
            if (!isOpen) setInvitationToDelete(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Pending Invitation?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to delete the invitation for <strong>{invitationToDelete.email}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvitationToDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteInvitation} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
                Delete Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
