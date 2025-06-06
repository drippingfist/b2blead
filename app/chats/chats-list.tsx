"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, PhoneCall, Clock, ChevronRight, Smile, Meh, Frown } from "lucide-react"
import Link from "next/link"

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

interface ChatsListProps {
  threads: Thread[]
}

export default function ChatsList({ threads }: ChatsListProps) {
  const [selectedBotFilter, setSelectedBotFilter] = useState<string | null>(null)

  // Filter out threads with count < 1
  const validThreads = threads.filter((thread) => thread.count >= 1)

  // Get unique bot names for filter (from valid threads only)
  const uniqueBots = Array.from(new Set(validThreads.map((thread) => thread.bot_share_name)))

  // Filter threads based on selected bot
  const filteredThreads = selectedBotFilter
    ? validThreads.filter((thread) => thread.bot_share_name === selectedBotFilter)
    : validThreads

  // Function to render sentiment icon based on score
  const renderSentimentIcon = (score: number) => {
    if (score >= 7) return <Smile className="h-4 w-4 text-green-500" />
    if (score >= 4) return <Meh className="h-4 w-4 text-amber-500" />
    return <Frown className="h-4 w-4 text-red-500" />
  }

  return (
    <div>
      {uniqueBots.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Badge
            variant={selectedBotFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedBotFilter(null)}
          >
            All Bots
          </Badge>
          {uniqueBots.map((bot) => (
            <Badge
              key={bot}
              variant={selectedBotFilter === bot ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedBotFilter(bot)}
            >
              {bot}
            </Badge>
          ))}
        </div>
      )}

      {filteredThreads.length > 0 && (
        <div className="text-sm text-gray-500 mb-4">
          {filteredThreads.length} {filteredThreads.length === 1 ? "thread" : "threads"}
        </div>
      )}

      {filteredThreads.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No chats found</h3>
          <p className="text-sm text-gray-500">There are no chat threads to display.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <Link href={`/chats/${thread.thread_id}`} key={thread.id}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {thread.bots?.client_name || thread.bot_share_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{thread.message_preview}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          {renderSentimentIcon(thread.sentiment_score)}
                          <span className="ml-1">Score: {thread.sentiment_score}</span>
                        </div>
                        {thread.duration && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{thread.duration}</span>
                          </div>
                        )}
                        {thread.cb_requested && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                            <PhoneCall className="h-3 w-3 mr-1" />
                            Callback
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
