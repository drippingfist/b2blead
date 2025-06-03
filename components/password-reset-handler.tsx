"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordResetHandlerProps {
  onRecoveryStateChange?: (isRecovery: boolean) => void
}

export default function PasswordResetHandler({ onRecoveryStateChange }: PasswordResetHandlerProps) {
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

  const updateRecoveryState = (recovery: boolean) => {
    setIsRecovery(recovery)
    onRecoveryStateChange?.(recovery)
  }

  useEffect(() => {
    const handleRecoveryFlow = async () => {
      try {
        // Only check for recovery if we're in the browser
        if (typeof window === "undefined") return

        // Check for recovery type in hash on page load
        const params = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const type = params.get("type")

        console.log("🔑 Checking recovery flow:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          currentPath: window.location.pathname,
        })

        // Only proceed if this is actually a recovery flow with tokens
        if (type === "recovery" && accessToken && refreshToken) {
          console.log("🔑 Recovery flow detected, setting session...")
          updateRecoveryState(true)
          setMessage("Setting up your session...")

          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            throw error
          }

          console.log("✅ Session established successfully:", data.session?.user?.email)
          setMessage("Please set your new password.")
          setIsError(false)

          // Clear the hash from the URL to prevent issues on refresh
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          // Not a recovery flow, make sure we're not showing recovery UI
          updateRecoveryState(false)
        }
      } catch (error: any) {
        console.error("❌ Error setting up recovery session:", error)
        setMessage(`Error setting up session: ${error.message}`)
        setIsError(true)
        updateRecoveryState(true) // Still show the form but with error
      }
    }

    // Run the recovery flow check
    handleRecoveryFlow()

    // Also listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state change:", event, session ? "Session exists" : "No session")

      if (event === "SIGNED_IN" && session && !isRecovery) {
        // Normal sign-in flow, redirect to dashboard
        console.log("👤 Normal sign-in detected, redirecting to dashboard")
        router.push("/")
      } else if (event === "SIGNED_OUT") {
        updateRecoveryState(false)
        setMessage("")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, onRecoveryStateChange, isRecovery])

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

      // Check if we have a session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`)
      }

      if (!session) {
        throw new Error("No active session found. Please try clicking the reset link again.")
      }

      console.log("✅ Session found, updating password for:", session.user.email)

      // Update the password
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
