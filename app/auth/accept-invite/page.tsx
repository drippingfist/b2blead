"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInvitationByEmail, deleteInvitationByEmail } from "@/lib/user-actions"
import { completeUserSetup } from "@/lib/setup-actions"

export default function AcceptInvitePage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "form" | "processing" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [inviteData, setInviteData] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const handleInvite = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")

      if (!accessToken || !refreshToken || type !== "invite") {
        setError("Invalid or expired invitation link. Please request a new one.")
        setStatus("error")
        return
      }

      try {
        // Manually set the session from the URL hash
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          throw sessionError
        }

        // Now that the session is set, get the user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user || !user.email) {
          throw userError || new Error("Could not retrieve user details.")
        }

        // At this point, the user is authenticated, and we can fetch their invitation details
        setEmail(user.email)
        const { success, invitation, error: inviteDetailsError } = await getInvitationByEmail(user.email)

        if (!success || !invitation) {
          throw new Error(
            inviteDetailsError || "Invitation details not found. The invitation may have already been used or expired.",
          )
        }

        setInviteData(invitation)
        setStatus("form")
      } catch (err: any) {
        console.error("❌ Error processing invitation:", err)
        setError(err.message || "Invalid or expired invitation link.")
        setStatus("error")
      }
    }

    handleInvite()
  }, []) // Empty dependency array ensures this runs only once on mount.

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setStatus("processing")
      setError(null)

      // Validate passwords
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters")
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Update the user's password
      const { error: passwordError } = await supabase.auth.updateUser({ password })

      if (passwordError) {
        throw passwordError
      }

      // Get the current user to create profile and bot access
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Failed to get user after password update")
      }

      if (inviteData) {
        const setupResult = await completeUserSetup({
          first_name: inviteData.first_name || "",
          surname: inviteData.surname || "",
          bot_share_name: inviteData.bot_share_name || "",
          role: inviteData.role || "member",
          email: email,
          invitation_id: inviteData.id,
        })

        if (!setupResult.success) {
          throw new Error(setupResult.error || "Failed to complete user setup")
        }
      }

      // Clean up the used invitation
      await deleteInvitationByEmail(email)

      setStatus("success")
      setTimeout(() => {
        router.push("/chats") // Redirect to chats after successful setup
      }, 2000)
    } catch (err: any) {
      console.error("❌ Error setting password:", err)
      setError(err.message || "Failed to set password")
      setStatus("form") // Go back to form to try again
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Processing your invitation...</h1>
          <p className="text-[#616161]">Please wait while we verify your invitation.</p>
        </div>
      </div>
    )
  }

  if (status === "form") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto mb-8" />
            <h1 className="text-2xl font-semibold text-[#212121] mb-2">Accept Invitation</h1>
            <p className="text-[#616161]">Set your password to complete your account setup.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">{error}</div>
          )}

          <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
            {/* ✅ Show invitation details from user_invitations table */}
            {inviteData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-[#212121] mb-2">Invitation Details</h3>
                <div className="space-y-1 text-sm text-[#616161]">
                  {inviteData.first_name && inviteData.surname && (
                    <p>
                      <span className="font-medium">Name:</span> {inviteData.first_name} {inviteData.surname}
                    </p>
                  )}
                  {inviteData.role && (
                    <p>
                      <span className="font-medium">Role:</span>{" "}
                      {inviteData.role.charAt(0).toUpperCase() + inviteData.role.slice(1)}
                    </p>
                  )}
                  {inviteData.bot_share_name && (
                    <p>
                      <span className="font-medium">Bot Access:</span> {inviteData.bot_share_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Create a secure password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
              >
                Set Password & Continue
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (status === "processing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Setting up your account...</h1>
          <p className="text-[#616161]">Please wait while we complete your account setup.</p>
        </div>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Account Created Successfully!</h1>
          <p className="text-[#616161] mb-4">Redirecting you to the dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Invitation Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => router.push("/auth/login")}
            className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-4 py-2"
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return null
}
