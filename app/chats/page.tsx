import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ChatsPageClient from "./chats-page-client"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // DON'T load any threads initially - let user select time period first
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
        <p className="text-gray-600 mt-1">Select a time period to view conversations</p>
      </div>

      <ChatsPageClient />
    </div>
  )
}
