"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Users, UserPlus, Trash, Plus, Loader2 } from "lucide-react"
import { DeleteUserModal } from "@/components/delete-user-modal"

interface User {
  id: string // This is the bot_users record ID
  user_id: string
  email?: string
  first_name?: string
  surname?: string
  role: string
  bot_share_name: string
  is_active: boolean
}

interface Bot {
  bot_share_name: string
  client_name: string
}

interface AllUser {
  id: string
  email: string
  first_name: string
  surname: string
}

interface AdminPageClientProps {
  initialUsers: User[]
  allBots: Bot[]
  allUsers: AllUser[]
}

export default function AdminPageClient({ initialUsers, allBots, allUsers }: AdminPageClientProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter state
  const [selectedBotFilter, setSelectedBotFilter] = useState<string>("all")

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    user_id: "",
    role: "member",
    bot_share_name: allBots.length > 0 ? allBots[0].bot_share_name : "",
  })

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  // Filter users based on selected bot
  const filteredUsers = useMemo(() => {
    if (selectedBotFilter === "all") {
      return users
    }
    return users.filter((user) => user.bot_share_name === selectedBotFilter)
  }, [users, selectedBotFilter])

  // Get bot client name for display
  const getBotClientName = (botShareName: string) => {
    const bot = allBots.find((b) => b.bot_share_name === botShareName)
    return bot?.client_name || botShareName
  }

  const refreshData = () => {
    router.refresh()
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleOpenAddModal = () => {
    // Pre-select the currently filtered bot if one is selected
    const preSelectedBot =
      selectedBotFilter !== "all" ? selectedBotFilter : allBots.length > 0 ? allBots[0].bot_share_name : ""

    setFormData({
      user_id: "",
      role: "member",
      bot_share_name: preSelectedBot,
    })
    setIsAddModalOpen(true)
  }

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.user_id || !formData.bot_share_name) {
      setError("Please select both a user and a bot")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if assignment already exists
      const existingAssignment = users.find(
        (u) => u.user_id === formData.user_id && u.bot_share_name === formData.bot_share_name,
      )

      if (existingAssignment) {
        setError("This user already has an assignment for this bot")
        setLoading(false)
        return
      }

      // Use API endpoint to create assignment
      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: formData.user_id,
          bot_share_name: formData.bot_share_name,
          role: formData.role,
          is_active: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add assignment")
      }

      setSuccess("User assignment added successfully!")
      setIsAddModalOpen(false)
      setFormData({
        user_id: "",
        role: "member",
        bot_share_name: allBots.length > 0 ? allBots[0].bot_share_name : "",
      })
      refreshData()
    } catch (err: any) {
      console.error("Error adding assignment:", err)
      setError(err.message || "Failed to add assignment")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Find the bot_users record to delete
      const userAssignment = users.find((u) => u.user_id === userToDelete.id)
      if (!userAssignment) {
        throw new Error("User assignment not found")
      }

      // Use API endpoint to delete assignment
      const response = await fetch(`/api/admin/assignments/${userAssignment.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete assignment")
      }

      setSuccess("User assignment deleted successfully!")
      refreshData()
    } catch (err: any) {
      console.error("Error deleting assignment:", err)
      setError(err.message || "Failed to delete assignment")
    } finally {
      setUserToDelete(null)
      setDeleteModalOpen(false)
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121] flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Admin Panel
          </h1>
          <p className="text-[#616161]">Manage user access to bots.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button onClick={handleOpenAddModal}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">{success}</div>
      )}

      <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg font-medium text-[#212121] flex items-center mb-4 md:mb-0">
            <Users className="h-5 w-5 mr-2" />
            Bot User Assignments
          </h2>
          <div className="flex items-center space-x-2">
            <Label htmlFor="bot-filter" className="text-sm font-medium">
              Filter by Bot:
            </Label>
            <Select value={selectedBotFilter} onValueChange={setSelectedBotFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bots</SelectItem>
                {allBots.map((bot) => (
                  <SelectItem key={bot.bot_share_name} value={bot.bot_share_name}>
                    {bot.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Bot</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.first_name || "-"} {user.surname || ""}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getBotClientName(user.bot_share_name)}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserToDelete({
                        id: user.user_id,
                        name: `${user.first_name} ${user.surname}`,
                        email: user.email,
                      })
                      setDeleteModalOpen(true)
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {selectedBotFilter === "all" ? "No user assignments found." : "No assignments found for this bot."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitAdd} className="space-y-4 py-4">
              <div>
                <Label htmlFor="user_id">Select User</Label>
                <Select
                  name="user_id"
                  value={formData.user_id}
                  onValueChange={(value) => handleSelectChange("user_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.surname} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bot_share_name">Assign to Bot</Label>
                <Select
                  name="bot_share_name"
                  value={formData.bot_share_name}
                  onValueChange={(value) => handleSelectChange("bot_share_name", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {allBots.map((bot) => (
                      <SelectItem key={bot.bot_share_name} value={bot.bot_share_name}>
                        {bot.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" className="bg-[#038a71] hover:bg-[#038a71]/90" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Assignment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteModalOpen && userToDelete && (
        <DeleteUserModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteUser}
          userName={userToDelete.name}
          userEmail={userToDelete.email}
        />
      )}
    </div>
  )
}
