import Link from "next/link"
import ForgotPasswordForm from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto" />
        </div>

        <ForgotPasswordForm />

        <div className="text-center text-[#616161] text-sm">
          Remember your password?{" "}
          <Link href="/auth/login" className="text-[#038a71] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
