"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Message {
  id: string
  created_at: string
  role: string
  content: string
  bot_share_name: string
}

export default function ChatMessages({ messages }: { messages: Message[] }) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

  const toggleMessageExpansion = (id: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedMessages(newExpanded)
  }

  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages found for this conversation.</p>
        </div>
      ) : (
        messages.map((message) => {
          const isBot = message.role === "assistant"
          const isExpanded = expandedMessages.has(message.id)
          const shouldTruncate = message.content.length > 300 && !isExpanded

          return (
            <div key={message.id} className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}>
              {isBot && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {message.bot_share_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`max-w-[75%] ${isBot ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-lg p-3 ${
                    isBot ? "bg-gray-100 text-gray-900" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {shouldTruncate ? `${message.content.substring(0, 300)}...` : message.content}
                  </p>
                  {message.content.length > 300 && (
                    <button
                      onClick={() => toggleMessageExpansion(message.id)}
                      className="text-xs underline mt-1 opacity-70 hover:opacity-100"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {format(new Date(message.created_at), "MMM d, h:mm a")}
                </div>
              </div>

              {!isBot && (
                <Avatar className="h-8 w-8 order-3">
                  <AvatarFallback className="bg-gray-300">U</AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
