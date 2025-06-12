"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, X, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRecoveryFlow = searchParams.get("recovery") === "true"

  const [step, setStep] = useState<"loading" | "password" | "processing" | "success" | "error">("loading")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if user has a current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          throw new Error("No active session found. Please request a new password reset link.")
        }

        console.log("✅ Session found for password reset:", session.user.email)
        setUserEmail(session.user.email)
        setStep("password")
      } catch (err: any) {
        console.error("❌ Error checking session:", err)
        setError(err.message || "Invalid session")
        setStep("error")
      }
    }

    // If this is a recovery flow from the callback handler, check the session
    if (isRecoveryFlow) {
      checkSession()
    } else {
      // Otherwise, handle the direct link with hash params
      const handlePasswordReset = async () => {
        try {
          console.log("🔑 Checking direct recovery flow:", window.location.hash)

          // Get the hash parameters from the URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          const type = hashParams.get("type")

          console.log("🔗 Processing password reset:", {
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
            type,
          })

          if (!accessToken || !refreshToken || type !== "recovery") {
            throw new Error("Invalid password reset link")
          }

          console.log("🔑 Recovery flow detected, setting session...")

          // Set the session to allow password update
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            throw sessionError
          }

          if (sessionData?.user?.email) {
            setUserEmail(sessionData.user.email)
            console.log("✅ Session established successfully:", sessionData.user.email)
          }

          setStep("password")
        } catch (err: any) {
          console.error("❌ Error processing password reset:", err)
          setError(err.message || "Invalid password reset link")
          setStep("error")
        }
      }

      if (window.location.hash) {
        handlePasswordReset()
      } else if (!isRecoveryFlow) {
        // No hash and not a recovery flow - show error
        setError("Invalid password reset link. Please request a new one.")
        setStep("error")
      }
    }
  }, [isRecoveryFlow])

  const handlePasswordUpdate = async () => {
    // Clear any previous errors
    setError(null)

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setStep("processing")

    try {
      console.log("🔐 Updating user password...")

      // Update the user's password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      })

      if (passwordError) {
        // Handle specific error cases
        if (passwordError.message.includes("New password should be different")) {
          throw new Error(
            "Your new password must be different from your current password. Please choose a different password.",
          )
        }
        throw passwordError
      }

      console.log("✅ Password updated successfully")

      setStep("success")

      // Clear the hash from URL to prevent re-processing
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname)
      }

      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (err: any) {
      console.error("❌ Error updating password:", err)
      setError(err.message || "Failed to update password")
      setStep("password") // Go back to password form instead of error state
    } finally {
      setLoading(false)
    }
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Verifying reset link...</h1>
          <p className="text-[#616161]">Please wait while we verify your password reset link.</p>
        </div>
      </div>
    )
  }

  if (step === "password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src="/logo.svg" alt="b2blead.ai" className="h-12 w-auto mx-auto mb-8" />
            <h1 className="text-2xl font-semibold text-[#212121] mb-2">Set New Password</h1>
            <p className="text-[#616161]">
              {userEmail ? `Setting new password for ${userEmail}` : "Enter your new password below."}
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] pr-10"
                    disabled={loading}
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
                    disabled={loading}
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
                onClick={handlePasswordUpdate}
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>

            <div className="text-xs text-[#616161] text-center mt-4 space-y-1">
              <p>Password must be at least 6 characters long.</p>
              <p>Choose a password different from your current one.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "processing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Updating your password...</h1>
          <p className="text-[#616161]">Please wait while we update your password.</p>
        </div>
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Password Updated Successfully!</h1>
          <p className="text-[#616161] mb-4">
            Your password has been updated successfully. You will be redirected to your dashboard in a few seconds.
          </p>
          <Button onClick={() => router.push("/")} className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-6 py-2">
            Go to Dashboard Now
          </Button>
        </div>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Reset Link Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => router.push("/auth/forgot-password")}
              className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-6 py-2 w-full"
            >
              Request New Reset Link
            </Button>
            <Button onClick={() => router.push("/auth/login")} variant="outline" className="w-full">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
