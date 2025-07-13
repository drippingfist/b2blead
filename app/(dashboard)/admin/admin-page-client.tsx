"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, X, Shield, Plus, Trash2, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Loading from "@/components/loading"

interface AdminPageClientProps {
  initialUserData: {
    id: string
    email: string
    firstName: string
    surname: string
  }
  isSuperAdmin: boolean
}

interface User {
  id: string
  email: string
  first_name: string
  surname: string
}

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
}

interface BotUserAssignment {
  id: string
  user_id: string
  bot_share_name: string
  role: "admin" | "member"
  is_active: boolean
  user_email: string
  user_name: string
  bot_client_name: string
}

export default function AdminPageClient({ initialUserData, isSuperAdmin }: AdminPageClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actualSuperAdminStatus, setActualSuperAdminStatus] = useState<boolean | null>(null)

  // Profile data
  const [userData, setUserData] = useState({
    ...initialUserData,
  })

  // Role assignment data
  const [users, setUsers] = useState<User[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [assignments, setAssignments] = useState<BotUserAssignment[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedBot, setSelectedBot] = useState("")
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member")

  // Check superadmin status on client side as well
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const response = await fetch("/api/user-bot-access")
        if (response.ok) {
          const data = await response.json()
          setActualSuperAdminStatus(data.isSuperAdmin)
        }
      } catch (err) {
        console.error("Error checking superadmin status:", err)
        setActualSuperAdminStatus(false)
      }
    }
    checkSuperAdminStatus()
  }, [])

  // Load initial data
  useEffect(() => {
    if (actualSuperAdminStatus === true) {
      loadRoleAssignmentData()
    } else if (actualSuperAdminStatus === false) {
      setLoading(false)
    }
  }, [actualSuperAdminStatus])

  const loadRoleAssignmentData = async () => {
    try {
      setLoading(true)

      // Load all users with emails from server-side API
      const usersResponse = await fetch("/api/admin/users")
      if (!usersResponse.ok) {
        throw new Error("Failed to load users")
      }
      const usersData = await usersResponse.json()
      setUsers(usersData.users || [])

      // Load all bots
      const { data: botsData } = await supabase
        .from("bots")
        .select("id, bot_share_name, client_name")
        .order("client_name")

      if (botsData) {
        setBots(botsData)
      }

      // Load all bot_users assignments from API
      const assignmentsResponse = await fetch("/api/admin/assignments")
      if (!assignmentsResponse.ok) {
        throw new Error("Failed to load assignments")
      }
      const assignmentsData = await assignmentsResponse.json()

      if (assignmentsData.success) {
        // Enrich assignments with user and bot details
        const enrichedAssignments = assignmentsData.assignments.map((assignment: any) => {
          const user = usersData.users?.find((u: User) => u.id === assignment.user_id)
          const bot = botsData?.find((b) => b.bot_share_name === assignment.bot_share_name)

          return {
            ...assignment,
            user_email: user?.email || "Unknown",
            user_name: `${user?.first_name || ""} ${user?.surname || ""}`.trim() || "Unknown",
            bot_client_name: bot?.client_name || assignment.bot_share_name,
          }
        })
        setAssignments(enrichedAssignments)
      }
    } catch (err: any) {
      console.error("Error loading role assignment data:", err)
      setError("Failed to load role assignment data")
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (success) setSuccess(false)
  }

  const handleCancel = () => {
    router.push("/dashboard")
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { error: updateError } = await supabase.from("user_profiles").upsert({
        id: userData.id,
        first_name: userData.firstName,
        surname: userData.surname,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
    } catch (err: any) {
      console.error("Error saving user data:", err)
      setError(err.message || "Failed to save user data")
    } finally {
      setSaving(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!selectedUser || !selectedBot) {
      setError("Please select both a user and a bot")
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Check if assignment already exists
      const existingAssignment = assignments.find((a) => a.user_id === selectedUser && a.bot_share_name === selectedBot)

      if (existingAssignment) {
        setError("This user already has an assignment for this bot")
        return
      }

      // Use API endpoint to create assignment
      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser,
          bot_share_name: selectedBot,
          role: selectedRole,
          is_active: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add assignment")
      }

      // Reload data
      await loadRoleAssignmentData()

      // Reset form
      setSelectedUser("")
      setSelectedBot("")
      setSelectedRole("member")
      setIsAddDialogOpen(false)
      setSuccess(true)
    } catch (err: any) {
      console.error("Error adding assignment:", err)
      setError(err.message || "Failed to add assignment")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAssignment = async (assignmentId: string, newRole: "admin" | "member") => {
    try {
      setSaving(true)
      setError(null)

      // Use API endpoint to update assignment
      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: newRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update assignment")
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) => (assignment.id === assignmentId ? { ...assignment, role: newRole } : assignment)),
      )

      setSuccess(true)
    } catch (err: any) {
      console.error("Error updating assignment:", err)
      setError(err.message || "Failed to update assignment")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (assignmentId: string, currentActive: boolean) => {
    try {
      setSaving(true)
      setError(null)

      // Use API endpoint to update assignment status
      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentActive,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update assignment status")
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, is_active: !currentActive } : assignment,
        ),
      )

      setSuccess(true)
    } catch (err: any) {
      console.error("Error toggling assignment status:", err)
      setError(err.message || "Failed to update assignment status")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) {
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Use API endpoint to delete assignment
      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete assignment")
      }

      // Remove from local state
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId))
      setSuccess(true)
    } catch (err: any) {
      console.error("Error deleting assignment:", err)
      setError(err.message || "Failed to delete assignment")
    } finally {
      setSaving(false)
    }
  }

  // Show loading while checking superadmin status
  if (actualSuperAdminStatus === null || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!actualSuperAdminStatus) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#212121] mb-4">Access Denied</h1>
          <p className="text-[#616161] mb-4">You need superadmin privileges to access this page.</p>
          <Button onClick={handleCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121] flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Admin Panel
          </h1>
          <p className="text-[#616161]">Manage user role assignments and admin profile.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center bg-transparent"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Changes saved successfully.
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Admin Profile</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={userData.firstName}
                  onChange={(e) => handleProfileChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  disabled={saving}
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  value={userData.surname}
                  onChange={(e) => handleProfileChange("surname", e.target.value)}
                  placeholder="Enter your surname"
                  disabled={saving}
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={userData.email}
                disabled={true}
                className="bg-gray-50 border-[#e0e0e0] text-gray-500"
              />
              <p className="text-xs text-[#616161]">Email address cannot be changed.</p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
            >
              {saving ? <Loading size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </div>

        {/* Role Assignments */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#212121] flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Role Assignments
            </h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Role Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.surname} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bot</Label>
                    <Select value={selectedBot} onValueChange={setSelectedBot}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bot" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.bot_share_name}>
                            {bot.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={(value: "admin" | "member") => setSelectedRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAssignment} disabled={saving}>
                      {saving ? <Loading size="sm" className="mr-2" /> : null}
                      Add Assignment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#616161] py-8">
                      No role assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.user_name}</div>
                          <div className="text-sm text-[#616161]">{assignment.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.bot_client_name}</TableCell>
                      <TableCell>
                        <Select
                          value={assignment.role}
                          onValueChange={(value: "admin" | "member") => handleUpdateAssignment(assignment.id, value)}
                          disabled={saving}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(assignment.id, assignment.is_active)}
                          disabled={saving}
                          className={assignment.is_active ? "text-green-600" : "text-red-600"}
                        >
                          {assignment.is_active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
