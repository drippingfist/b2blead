import MagicLinkForm from "@/components/magic-link-form"

export default function MagicLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto mb-8" />
        </div>
        <MagicLinkForm />
      </div>
    </div>
  )
}
