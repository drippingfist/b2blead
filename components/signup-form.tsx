"use client"

import { useActionState } from "react"
import { captureSignup } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, Info } from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function SignupForm() {
  const [state, action, isPending] = useActionState(captureSignup, null)

  if (state?.success) {
    return (
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Thank You for Signing Up!</h1>
          <p className="text-[#616161] mb-6">We've received your information and will be in touch shortly.</p>
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
    <TooltipProvider>
      <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Sign Up</h1>
          <p className="text-[#616161]">We're currently in a closed beta. Sign up to get on the list.</p>
        </div>

        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">First Name</Label>
            <Input id="name" name="name" required disabled={isPending} placeholder="e.g. Jane" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isPending}
              placeholder="e.g. jane@disney.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Tooltip>
                <TooltipTrigger type="button">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    Please enter the name of your company as you would like the AI to refer to it. e.g The Walt Disney
                    Company would enter "Disney" here.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input id="companyName" name="companyName" required disabled={isPending} placeholder="e.g. Disney" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyUrl">Company URL</Label>
            <Input
              id="companyUrl"
              name="companyUrl"
              type="url"
              disabled={isPending}
              placeholder="https://example.com"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white py-3 text-base font-medium h-12"
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign Up"}
          </Button>
        </form>
      </div>
    </TooltipProvider>
  )
}
