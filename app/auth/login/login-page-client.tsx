"use client"

import { useState } from "react"
import LoginForm from "@/components/login-form"
import InviteHandler from "@/components/invite-handler"
import PasswordResetHandler from "@/components/password-reset-handler"

export default function LoginPageClient() {
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto" />
        </div>

        {/* Handle password reset if present */}
        <PasswordResetHandler onRecoveryStateChange={setIsRecoveryMode} />

        {/* Handle invitation acceptance if present and not in recovery mode */}
        {!isRecoveryMode && <InviteHandler />}

        {/* Show login form only if not in recovery mode */}
        <LoginForm isHidden={isRecoveryMode} />
      </div>
    </div>
  )
}
