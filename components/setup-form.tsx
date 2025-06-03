"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Check, User, Building, Globe } from "lucide-react"
import { completeUserSetup } from "@/lib/setup-actions"
import { useRouter } from "next/navigation"

interface InvitationData {
  first_name: string
  surname: string
  timezone: string
  bot_share_name: string
  role: string
  invitation_id: string
  email: string
}

interface SetupFormProps {
  invitationData: InvitationData
}

export default function SetupForm({ invitationData }: SetupFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSetup = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await completeUserSetup(invitationData)

      if (result.success) {
        setSuccess(true)
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError(result.error || "Failed to complete setup")
      }
    } catch (err: any) {
      console.error("Setup error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#212121] mb-2">Setup Complete!</h2>
        <p className="text-[#616161] mb-4">Your account has been successfully configured.</p>
        <p className="text-sm text-[#616161]">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      <h2 className="text-xl font-semibold text-[#212121] mb-6 text-center">Confirm Your Details</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">{error}</div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <User className="h-5 w-5 text-[#616161] mr-3" />
          <div>
            <p className="text-sm font-medium text-[#212121]">
              {invitationData.first_name} {invitationData.surname}
            </p>
            <p className="text-xs text-[#616161]">{invitationData.email}</p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <Building className="h-5 w-5 text-[#616161] mr-3" />
          <div>
            <p className="text-sm font-medium text-[#212121]">Bot Access</p>
            <p className="text-xs text-[#616161]">{invitationData.bot_share_name}</p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-md">
          <Globe className="h-5 w-5 text-[#616161] mr-3" />
          <div>
            <p className="text-sm font-medium text-[#212121]">Role & Timezone</p>
            <p className="text-xs text-[#616161]">
              {invitationData.role.charAt(0).toUpperCase() + invitationData.role.slice(1)} •{" "}
              {invitationData.timezone || "Asia/Bangkok"}
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSetup}
        disabled={loading}
        className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Setting up your account...
          </>
        ) : (
          "Complete Setup"
        )}
      </Button>

      <p className="text-xs text-[#616161] text-center mt-4">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
