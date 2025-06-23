"use client"
import LoginForm from "@/components/login-form"
import InviteHandler from "@/components/invite-handler"

export default function LoginPageClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto" />
        </div>

        {/* Handle invitation acceptance if present and not in recovery mode */}
        <InviteHandler />

        {/* Show login form only if not in recovery mode */}
        <LoginForm isHidden={false} />
      </div>
    </div>
  )
}
