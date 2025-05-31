"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

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
          Signing up...
        </>
      ) : (
        "Sign Up"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  // Initialize with null as the initial state
  const [state, formAction] = useActionState(signUp, null)

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 md:p-8 shadow-md rounded-lg border border-[#e0e0e0]">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-[#212121]">Create an account</h2>

        <form action={formAction} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{state.error}</div>
          )}

          {state?.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              {state.success}
            </div>
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

          <SubmitButton />
        </form>
      </div>

      <div className="text-center text-[#616161] text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#038a71] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
