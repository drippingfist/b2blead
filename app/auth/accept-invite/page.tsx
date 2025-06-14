"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInvitationByEmail, deleteInvitationByEmail } from "@/lib/user-actions"

export default function AcceptInvitePage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "form" | "processing" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [inviteData, setInviteData] = useState<any>(null)

  useEffect(() => {
    const processInvitation = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get("token")
        const type = urlParams.get("type")

        if (!token || type !== "invite") {
          // This handles the case where Supabase redirects back without a token
          // after the token has been used. We can redirect to login.
          console.log("No valid token found, redirecting to login.")
          router.push("/auth/login")
          return
        }

        console.log("🔍 Verifying invitation token...")
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "invite",
        })

        if (authError) throw authError
        if (!authData.user?.email) throw new Error("Could not get user email from invitation token.")

        const userEmail = authData.user.email
        setEmail(userEmail)
        console.log("✅ Invitation token verified for email:", userEmail)

        console.log("🔍 Fetching invitation details from server...")
        const { success, invitation, error: inviteDetailsError } = await getInvitationByEmail(userEmail)

        if (!success || !invitation) {
          throw new Error(inviteDetailsError || "Invitation details not found in the database.")
        }

        console.log("✅ Fetched invitation details:", invitation)
        setInviteData(invitation)
        setStatus("form")
      } catch (err: any) {
        console.error("❌ Error processing invitation:", err)
        setError(err.message || "Invalid or expired invitation link.")
        setStatus("error")
      }
    }

    processInvitation()
  }, [router])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setStatus("processing")
      setError(null)

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters")
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError
      console.log("✅ Password set successfully")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Failed to get user after password update")

      if (inviteData) {
        console.log("📝 Creating user profile and bot access...")
        const { error: profileError } = await supabase.from("user_profiles").upsert({
          id: user.id,
          first_name: inviteData.first_name || "",
          surname: inviteData.surname || "",
          bot_share_name: inviteData.bot_share_name || "",
        })
        if (profileError) console.error("❌ Error creating user profile:", profileError)
        else console.log("✅ User profile created")

        const { error: botUserError } = await supabase.from("bot_users").upsert({
          user_id: user.id,
          role: inviteData.role || "member",
          bot_share_name: inviteData.bot_share_name || "",
          is_active: true,
        })
        if (botUserError) console.error("❌ Error creating bot user:", botUserError)
        else console.log("✅ Bot user access created")
      }

      console.log("🗑️ Deleting used invitation record...")
      await deleteInvitationByEmail(email)

      setStatus("success")
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err: any) {
      console.error("❌ Error setting password:", err)
      setError(err.message || "Failed to set password")
      setStatus("form")
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Create a secure password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                />
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
