"use client"

import { useActionState } from "react"
import { signIn } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginForm() {
  const [state, action, isPending] = useActionState(signIn, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard")
    }
  }, [state?.success, router])

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
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required disabled={isPending} />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
        >
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign In"}
        </Button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-[#e0e0e0]">
        <p className="text-sm text-[#616161]">
          Forgot your password?{" "}
          <Link href="/auth/forgot-password" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Reset Password
          </Link>
        </p>
        <p className="text-sm text-[#616161] mt-2">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-[#038a71] hover:text-[#038a71]/80 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
