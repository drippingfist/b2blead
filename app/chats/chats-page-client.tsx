"use client"

import { useRouter } from "next/navigation"
import ChatsList from "./chats-list"

interface Thread {
  id: string
  created_at: string
  bot_share_name: string
  thread_id: string
  updated_at: string
  duration: string | null
  message_preview: string
  sentiment_score: number
  cb_requested: boolean
  count: number
  bots: {
    client_name: string
  } | null
}

interface ChatsPageClientProps {
  threads: Thread[]
  isSuperAdmin: boolean
}

export default function ChatsPageClient({ threads, isSuperAdmin }: ChatsPageClientProps) {
  const router = useRouter()

  const handleThreadsDeleted = () => {
    router.refresh()
  }

  return <ChatsList threads={threads} isSuperAdmin={isSuperAdmin} onThreadsDeleted={handleThreadsDeleted} />
}
