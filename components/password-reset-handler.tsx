"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PasswordResetHandler() {
  const router = useRouter()
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    // This listener is crucial for handling auth state changes,
    // including session updates from recovery links
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state change:", event, session ? "Session exists" : "No session")

      if (event === "SIGNED_IN" && session) {
        // Check if the user is signed in via a recovery link
        const params = new URLSearchParams(window.location.hash.substring(1))
        if (params.get("type") === "recovery") {
          console.log("🔑 Recovery flow detected via auth state change")
          setIsRecovery(true)
          setMessage("Please set your new password.")
          setIsError(false)
          // Clear the hash from the URL to prevent issues on refresh
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          // Normal sign-in flow, redirect to dashboard
          console.log("👤 Normal sign-in detected, redirecting to dashboard")
          router.push("/")
        }
      }
    })

    // Initial check for recovery type in hash on page load
    const params = new URLSearchParams(window.location.hash.substring(1))
    if (params.get("type") === "recovery") {
      console.log("🔑 Recovery flow detected on initial load")
      setIsRecovery(true)
      setMessage("Please set your new password.")
      // Don't clear the hash yet - let the auth state change handler do it
    }

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setIsError(false)
    setIsLoading(true)

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.")
      setIsError(true)
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.")
      setIsError(true)
      setIsLoading(false)
      return
    }

    try {
      console.log("🔐 Updating user password...")

      // The `supabase.auth.updateUser` method will use the session
      // established by the recovery link
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      console.log("✅ Password updated successfully")
      setMessage("Password updated successfully! Redirecting to dashboard...")
      setIsError(false)
      setIsSuccess(true)
      setNewPassword("")
      setConfirmPassword("")

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      console.error("❌ Error updating password:", error)
      setMessage(`Error updating password: ${error.message}`)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything if this is not a recovery flow
  if (!isRecovery) {
    return null
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      {isSuccess ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Password Updated Successfully!</h1>
          <p className="text-[#616161] mb-4">Your password has been updated. Redirecting to your dashboard...</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-[#212121] mb-2">Set New Password</h1>
            <p className="text-[#616161]">Enter your new password below.</p>
          </div>

          {message && (
            <div
              className={`${
                isError ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
              } px-4 py-3 rounded mb-4 text-sm border`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#616161] hover:text-[#212121]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#616161] hover:text-[#212121]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>

          <p className="text-xs text-[#616161] text-center mt-4">Password must be at least 6 characters long.</p>
        </>
      )}
    </div>
  )
}
