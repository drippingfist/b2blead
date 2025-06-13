import { Suspense } from "react"
import MagicLinkForm from "@/components/magic-link-form"

// Server component that can safely access searchParams
export default function MagicLinkPage({
  searchParams,
}: {
  searchParams: { redirect_to?: string }
}) {
  // Get the redirect_to parameter from the URL
  const redirectTo = searchParams.redirect_to || "/"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto mb-8" />
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <MagicLinkForm redirectTo={redirectTo} />
        </Suspense>
      </div>
    </div>
  )
}
