import Link from "next/link"
import { Check } from "lucide-react"
import ForgotPasswordForm from "@/components/forgot-password-form"

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const error = searchParams.error as string | undefined
  const success = searchParams.success as string | undefined

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto" />
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-[#212121] mb-2">Reset Email Sent!</h1>
              <p className="text-[#616161] mb-4">
                We've sent a password reset link to <strong>{success}</strong>
              </p>
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto" />
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
