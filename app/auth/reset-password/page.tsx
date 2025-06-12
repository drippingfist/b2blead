"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"loading" | "password" | "processing" | "success" | "error">("loading")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log("🔗 Processing password reset...")

        // Check for error from callback
        const errorParam = searchParams.get("error")
        if (errorParam === "invalid_link") {
          throw new Error("Invalid or expired password reset link. Please request a new one.")
        }

        // Check for hash fragments first (direct Supabase flow)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          const type = hashParams.get("type")
          const hashError = hashParams.get("error")
          const errorDescription = hashParams.get("error_description")

          console.log("🔗 Hash parameters found:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type,
            error: hashError,
            errorDescription,
          })

          if (hashError) {
            console.error("❌ Error in hash parameters:", hashError, errorDescription)
            throw new Error(errorDescription || hashError)
          }

          if (accessToken && refreshToken && type === "recovery") {
            console.log("🔐 Setting session from recovery tokens...")
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error("❌ Error setting session:", sessionError)
              throw new Error("Failed to authenticate with reset link tokens.")
            }

            console.log("✅ Session set successfully from recovery tokens.")
            setStep("password")
            // Clear the hash from the URL now that we've used it
            router.replace("/auth/reset-password", { scroll: false })
            return
          }
        }

        // Check for existing session (from callback flow)
        console.log("🔗 Checking for existing session...")
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("🔗 Session check result:", {
          hasSession: !!session,
          hasUser: !!session?.user,
          error: sessionError,
        })

        if (sessionError) {
          console.error("❌ Session error:", sessionError)
          throw new Error("Failed to verify session")
        }

        if (session && session.user) {
          console.log("✅ Valid session found, proceeding to password reset")
          setStep("password")
          return
        }

        // If we get here, we don't have valid authentication
        throw new Error("Invalid or expired password reset link. Please request a new one.")
      } catch (err: any) {
        console.error("❌ Error processing password reset:", err)
        setError(err.message || "Invalid password reset link")
        setStep("error")
      }
    }

    handlePasswordReset()
  }, [router, searchParams])

  const handlePasswordUpdate = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError(null)
    setStep("processing")

    try {
      console.log("🔐 Updating user password...")

      // Update the user's password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      })

      if (passwordError) {
        throw passwordError
      }

      console.log("✅ Password updated successfully")

      setStep("success")
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err: any) {
      console.error("❌ Error updating password:", err)
      setError(err.message || "Failed to update password")
      setStep("error")
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
            <p className="text-[#616161]">Enter your new password below.</p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
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

            <p className="text-xs text-[#616161] text-center mt-4">Password must be at least 6 characters long.</p>
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
          <p className="text-[#616161] mb-4">Your password has been updated. Redirecting to your dashboard...</p>
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
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Reset Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/auth/forgot-password")}
              className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-4 py-2 rounded-md mr-2"
            >
              Request New Reset Link
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
