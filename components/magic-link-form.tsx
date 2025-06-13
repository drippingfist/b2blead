"use client"

import { useState } from "react"
import { sendMagicLink } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check } from "lucide-react"
import Link from "next/link"

// Accept redirectTo as a prop instead of using useSearchParams
export default function MagicLinkForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<{
    success?: boolean
    error?: string
  }>({})

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)

    try {
      const email = formData.get("email") as string
      const result = await sendMagicLink(email, redirectTo)

      if (result.error) {
        setFormState({ error: result.error })
      } else {
        setFormState({ success: true })
      }
    } catch (error) {
      setFormState({ error: "An unexpected error occurred. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (formState.success) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Check Your Email</h1>
          <p className="text-[#616161] mb-4">
            If an account with that email exists, we've sent you a magic link to sign in.
          </p>
          <p className="text-sm text-[#616161] mb-6">
            Please check your email and click the link to sign in instantly.
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
        <h1 className="text-2xl font-semibold text-[#212121] mb-2">Get Magic Link</h1>
        <p className="text-[#616161]">Enter your email address and we'll send you a magic link to sign in instantly.</p>
      </div>

      {formState.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {formState.error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
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
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending magic link...
            </>
          ) : (
            "Send Magic Link"
          )}
        </Button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-[#e0e0e0]">
        <p className="text-sm text-[#616161]">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Sign in with password
          </Link>
        </p>
      </div>
    </div>
  )
}
