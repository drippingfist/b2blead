"use client"

import { useActionState } from "react"
import { signIn } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect_to") || "/"

  const [state, action, isPending] = useActionState(signIn, null)

  // Handle successful login
  useEffect(() => {
    if (state?.success) {
      router.push(redirectTo)
    }
  }, [state, router, redirectTo])

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-[#212121] mb-2">Sign In</h1>
        <p className="text-[#616161]">Welcome back! Please sign in to your account.</p>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{state.error}</div>
      )}

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[#038a71] hover:text-[#038a71]/80 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
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
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-[#e0e0e0]">
        <p className="text-sm text-[#616161]">
          Don't have an account?{" "}
          <Link href="/auth/sign-up" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-sm text-[#616161] mt-2">
          <Link href="/auth/magic-link" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Sign in with magic link
          </Link>
        </p>
      </div>
    </div>
  )
}
