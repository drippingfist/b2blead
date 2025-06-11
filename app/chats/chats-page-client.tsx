"use client"

import { useState, useCallback } from "react"
import ThreadsView from "@/components/threads-view"
import type { Thread } from "@/lib/simple-database"

interface ChatsPageClientProps {
  initialThreads: Thread[]
  totalCount: number
}

export default function ChatsPageClient({ initialThreads, totalCount }: ChatsPageClientProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [hasMore, setHasMore] = useState(initialThreads.length === 20)
  const [loading, setLoading] = useState(false)

  const loadMoreThreads = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      console.log("🔄 Loading more threads, current count:", threads.length)

      const response = await fetch(`/api/threads?limit=20&offset=${threads.length}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log("✅ Loaded", data.threads.length, "more threads")

      if (data.threads && data.threads.length > 0) {
        setThreads((prev) => [...prev, ...data.threads])
        setHasMore(data.hasMore && data.threads.length === 20)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("❌ Error loading more threads:", error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [threads.length, loading, hasMore])

  const handleRefresh = useCallback(async () => {
    try {
      console.log("🔄 Refreshing threads...")

      const response = await fetch("/api/threads?limit=20&offset=0")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log("✅ Refreshed with", data.threads.length, "threads")

      setThreads(data.threads || [])
      setHasMore(data.hasMore && (data.threads?.length || 0) === 20)
    } catch (error) {
      console.error("❌ Error refreshing threads:", error)
    }
  }, [])

  return (
    <ThreadsView
      initialThreads={threads}
      onRefresh={handleRefresh}
      onLoadMore={loadMoreThreads}
      hasMore={hasMore}
      totalCount={totalCount}
    />
  )
}
