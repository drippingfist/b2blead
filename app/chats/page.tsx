"use client"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getThreadsSimple, getThreadsCount } from "@/lib/simple-database"
import ChatsPageClient from "./chats-page-client"

const THREADS_PER_PAGE = 20

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get initial threads using the existing function
  const initialThreads = await getThreadsSimple(20) // Load first 20 threads
  const totalCount = await getThreadsCount()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
        <p className="text-gray-600 mt-1">{totalCount} total conversations</p>
      </div>

      <ChatsPageClient initialThreads={initialThreads} totalCount={totalCount} />
    </div>
  )
}
