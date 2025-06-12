import { Loader2 } from "lucide-react"

export default function UpdatePasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#038a71] mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-[#212121] mb-2">Loading...</h1>
        <p className="text-[#616161]">Please wait while we prepare the password reset form.</p>
      </div>
    </div>
  )
}
