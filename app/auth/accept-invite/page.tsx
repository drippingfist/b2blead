"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Check, X } from "lucide-react"

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleInviteAcceptance = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get("code")
        const type = searchParams.get("type")

        console.log("🔗 Processing invite acceptance:", {
          code: !!code,
          type,
          fullUrl: window.location.href,
        })

        if (!code) {
          throw new Error("No invitation code found")
        }

        if (type !== "invite") {
          throw new Error("Invalid invitation type")
        }

        // Exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }

        console.log("✅ Session created successfully, user:", data.user?.email)

        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user!.id)
          .single()

        if (existingProfile) {
          // User already exists, redirect to dashboard
          console.log("✅ User already has profile, redirecting to dashboard")
          setStatus("success")
          setTimeout(() => {
            router.push("/")
          }, 2000)
        } else {
          // New user, redirect to setup
          console.log("🔧 New user, redirecting to setup")
          setStatus("success")
          setTimeout(() => {
            router.push("/auth/setup")
          }, 2000)
        }
      } catch (err: any) {
        console.error("❌ Error accepting invitation:", err)
        setError(err.message || "Failed to accept invitation")
        setStatus("error")
      }
    }

    handleInviteAcceptance()
  }, [router, searchParams])

  if (status === "processing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Processing your invitation...</h1>
          <p className="text-[#616161]">Please wait while we set up your account.</p>
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
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Invitation Accepted!</h1>
          <p className="text-[#616161] mb-4">Redirecting you to complete your account setup...</p>
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
          <button
            onClick={() => router.push("/auth/login")}
            className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-4 py-2 rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}
