"use client"

import { useEffect, useState } from "react"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if we have a hash in the URL (which means we have a valid reset token)
    const hasResetToken = window.location.hash && window.location.hash.includes("type=recovery")

    if (!hasResetToken) {
      setError("Invalid or missing password reset token. Please request a new password reset link.")
      setLoading(false)
      return
    }

    // If we have a token, we're good to show the Auth UI
    setLoading(false)

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔐 Auth state change:", event)

      // If the user has successfully updated their password, redirect them
      if (event === "PASSWORD_RECOVERY") {
        console.log("✅ Password updated successfully")

        // Short delay before redirect
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Reset Link Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/auth/forgot-password")}
            className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-6 py-2 rounded-md"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2blead.ai" className="h-12 w-auto mx-auto mb-8" />
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Set New Password</h1>
          <p className="text-[#616161]">Enter your new password below.</p>
        </div>

        <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
          <Auth
            supabaseClient={supabase}
            view="update_password"
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#038a71",
                    brandAccent: "#038a71",
                  },
                },
              },
              className: {
                button: "bg-[#038a71] hover:bg-[#038a71]/90",
                input: "rounded-md border-[#e0e0e0]",
                label: "text-sm font-medium text-[#212121]",
              },
            }}
            showLinks={false}
            redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}`}
          />
        </div>
      </div>
    </div>
  )
}
