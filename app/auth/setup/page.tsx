import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SetupForm from "@/components/setup-form"

export default async function SetupPage() {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user already has a profile (already set up)
  const { data: existingProfile } = await supabase.from("user_profiles").select("id").eq("id", session.user.id).single()

  if (existingProfile) {
    // User is already set up, redirect to dashboard
    redirect("/")
  }

  // Get invitation data from user metadata
  const userMetadata = session.user.user_metadata
  const invitationData = {
    first_name: userMetadata.first_name || "",
    surname: userMetadata.surname || "",
    timezone: userMetadata.timezone || "Asia/Bangkok",
    bot_share_name: userMetadata.bot_share_name || "",
    role: userMetadata.role || "member",
    invitation_id: userMetadata.invitation_id || "",
    email: session.user.email || "",
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto mx-auto mb-8" />
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Welcome to b2bLEAD.ai!</h1>
          <p className="text-[#616161]">Complete your account setup to get started.</p>
        </div>

        <SetupForm invitationData={invitationData} />
      </div>
    </div>
  )
}
