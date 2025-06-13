"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import { sendMagicLink } from "@/lib/actions"
import { useSearchParams } from "next/navigation"

export default function MagicLinkForm() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect_to") || "/"

  const [state, formAction] = useFormState(sendMagicLink, {})

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    // The actual submission is handled by the formAction
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Magic Link</h2>
      <p className="mb-4 text-gray-600 text-center">
        Enter your email address and we&apos;ll send you a magic link to sign in.
      </p>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden field to pass the redirect_to parameter */}
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>

      {state?.error && <div className="mt-4 text-sm text-red-600">{state.error}</div>}

      {state?.success && <div className="mt-4 text-sm text-green-600">{state.success}</div>}

      <div className="mt-6 text-center">
        <a href="/auth/login" className="text-sm text-green-600 hover:text-green-500">
          Back to login
        </a>
      </div>
    </div>
  )
}
