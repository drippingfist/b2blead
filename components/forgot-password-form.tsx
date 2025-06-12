"use client"

import { useActionState } from "react"
import { sendPasswordReset } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(sendPasswordReset, null)

  if (state?.success) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Check Your Email</h1>
          <p className="text-[#616161] mb-4">{state.success}</p>
          <p className="text-sm text-[#616161] mb-6">
            Please check your email and click the link to reset your password.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-[#038a71] hover:bg-[#038a71]/90 text-white px-6 py-2 rounded-md text-sm font-medium"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-[#212121] mb-2">Reset Password</h1>
        <p className="text-[#616161]">Enter your email address and we'll send you a reset link if an account exists.</p>
      </div>

      {/* We don't show specific errors to prevent email enumeration */}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email address"
            className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
            disabled={isPending}
          />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending reset email...
            </>
          ) : (
            "Send Reset Email"
          )}
        </Button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-[#e0e0e0]">
        <p className="text-sm text-[#616161]">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
