"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { redirect } from "next/navigation"
import ThreadsView from "@/components/threads-view"

const THREADS_PER_PAGE = 20

export default function ChatsPage() {
  const [user, setUser] = useState<any>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    setUser(user)
    await loadInitialThreads()
  }

  const loadInitialThreads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("threads")
        .select(`
          id,
          thread_id,
          created_at,
          updated_at,
          message_preview,
          count,
          bot_share_name,
          duration,
          sentiment_score,
          sentiment_justification,
          cb_requested,
          mean_response_time,
          starred,
          bots(bot_display_name, client_name)
        `)
        .gt("count", 0)
        .order("updated_at", { ascending: false })
        .range(0, THREADS_PER_PAGE - 1)

      if (error) {
        console.error("Error fetching threads:", error)
        return
      }

      setThreads(data || [])
      setOffset(THREADS_PER_PAGE)
      setHasMore((data || []).length === THREADS_PER_PAGE)
    } catch (error) {
      console.error("Exception fetching threads:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreThreads = async () => {
    if (!hasMore) return

    try {
      const { data, error } = await supabase
        .from("threads")
        .select(`
          id,
          thread_id,
          created_at,
          updated_at,
          message_preview,
          count,
          bot_share_name,
          duration,
          sentiment_score,
          sentiment_justification,
          cb_requested,
          mean_response_time,
          starred,
          bots(bot_display_name, client_name)
        `)
        .gt("count", 0)
        .order("updated_at", { ascending: false })
        .range(offset, offset + THREADS_PER_PAGE - 1)

      if (error) {
        console.error("Error loading more threads:", error)
        return
      }

      const newThreads = data || []
      setThreads((prev) => [...prev, ...newThreads])
      setOffset((prev) => prev + THREADS_PER_PAGE)
      setHasMore(newThreads.length === THREADS_PER_PAGE)
    } catch (error) {
      console.error("Exception loading more threads:", error)
    }
  }

  const handleRefresh = async () => {
    setOffset(0)
    setHasMore(true)
    await loadInitialThreads()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
          <span className="ml-3 text-gray-600">Loading chats...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
        <p className="text-gray-600 mt-1">{threads.length} conversations loaded</p>
      </div>

      <ThreadsView
        initialThreads={threads}
        onRefresh={handleRefresh}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        totalCount={threads.length}
      />
    </div>
  )
}
