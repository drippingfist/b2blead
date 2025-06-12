"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      console.log("📤 Sending password reset request for:", email)

      const formData = new FormData()
      formData.append("email", email)

      console.log("🌐 Making request to /api/reset-password")

      const response = await fetch("/api/reset-password", {
        method: "POST",
        body: formData,
      })

      console.log("📥 Response status:", response.status)
      console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("📥 Raw response:", responseText.substring(0, 200) + "...")

      let data
      try {
        data = JSON.parse(responseText)
        console.log("✅ Parsed JSON:", data)
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError)
        console.error("❌ Response was:", responseText.substring(0, 500))
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`)
      }

      if (data.success) {
        setIsSuccess(true)
        setMessage(data.message)
        console.log("✅ Password reset request successful")
      } else {
        setError(data.error || "An error occurred")
        console.log("❌ Password reset request failed:", data.error)
      }
    } catch (error: any) {
      console.error("💥 Password reset request error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Check Your Email</h1>
          <p className="text-[#616161] mb-6">{message}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center text-[#038a71] hover:text-[#038a71]/80 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-[#212121] mb-2">Forgot Password</h1>
        <p className="text-[#616161]">Enter your email address and we'll send you a link to reset your password.</p>
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
          Back to Login
        </Link>
      </div>
    </div>
  )
}
