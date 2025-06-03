"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/login`,
      })

      if (error) {
        throw error
      }

      setIsSuccess(true)
    } catch (err: any) {
      console.error("Password reset error:", err)
      setError(err.message || "Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Check Your Email</h1>
          <p className="text-[#616161] mb-6">
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the
            instructions to reset your password.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-[#038a71] hover:text-[#038a71]/80 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-[#212121] mb-2">Forgot Password</h1>
        <p className="text-[#616161]">Enter your email address to receive a password reset link.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
            disabled={isLoading}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-[#038a71] hover:text-[#038a71]/80 hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
