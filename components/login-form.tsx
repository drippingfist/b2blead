"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 md:py-6 text-base md:text-lg font-medium rounded-md h-[50px] md:h-[50px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 md:p-8 shadow-md rounded-lg border border-[#e0e0e0]">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-[#212121]">Sign in</h2>

        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{state.error}</div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#616161]">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#616161]">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71] h-12"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#038a71] focus:ring-[#038a71] border-[#e0e0e0] rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-[#616161]">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="text-[#038a71] hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <SubmitButton />
        </form>
      </div>

      <div className="text-center text-[#616161] text-sm">
        Don't have an account?{" "}
        <Link href="/auth/sign-up" className="text-[#038a71] hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}
