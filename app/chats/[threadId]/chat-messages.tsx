"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { formatTimeInTimezone } from "@/lib/timezone-utils"

interface Message {
  id: string
  created_at: string
  role: string
  content: string
  bot_share_name: string
}

interface ChatMessagesProps {
  messages: Message[]
  threadId: string
}

export default function ChatMessages({ messages, threadId }: ChatMessagesProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [botTimezone, setBotTimezone] = useState<string>("UTC")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBotTimezone() {
      try {
        // Get the bot_share_name from the first message or thread
        const botShareName = messages[0]?.bot_share_name

        if (botShareName) {
          const { data: bot, error } = await supabase
            .from("bots")
            .select("timezone")
            .eq("bot_share_name", botShareName)
            .single()

          if (!error && bot?.timezone) {
            setBotTimezone(bot.timezone)
          }
        }
      } catch (error) {
        console.error("Error fetching bot timezone:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBotTimezone()
  }, [messages, threadId])

  const toggleMessageExpansion = (id: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedMessages(newExpanded)
  }

  if (loading) {
    return (
      <div className="space-y-6 bg-[#f9fafc] px-[10%] py-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-[#f9fafc] px-[10%] py-4">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages found for this conversation.</p>
        </div>
      ) : (
        messages.map((message) => {
          const isBot = message.role === "assistant"
          const isUser = message.role === "user"
          const isPresetMessage = message.role === "suggested_button" || message.role === "menu_button"
          const isLeftSide = isUser || isPresetMessage
          const content = message.content || ""
          const isExpanded = expandedMessages.has(message.id)
          const shouldTruncate = content.length > 300 && !isExpanded

          return (
            <div key={message.id} className={`flex ${isLeftSide ? "justify-start" : "justify-end"} mb-8 group`}>
              {/* Star button for left side messages */}
              {isLeftSide && (
                <button className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] mr-2 opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Star className="h-4 w-4 text-[#616161]" />
                </button>
              )}

              <div className={`flex flex-col ${isLeftSide ? "items-start" : "items-end"} max-w-[60%] min-w-[120px]`}>
                {/* Labels for left side messages */}
                {isUser && (
                  <div className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide px-2">USER</div>
                )}
                {isPresetMessage && (
                  <div className="text-xs font-medium text-green-700 mb-1 uppercase tracking-wide px-2">
                    Preset message
                  </div>
                )}

                <div
                  className={`relative w-full ${
                    isBot
                      ? "bg-[#424242] text-white rounded-2xl rounded-br-md"
                      : isPresetMessage
                        ? "bg-[#f0fdf4] border border-green-200 rounded-2xl rounded-bl-md"
                        : "bg-[#ffffff] border border-[#e0e0e0] rounded-2xl rounded-bl-md"
                  } px-4 py-3 shadow-sm`}
                >
                  <p className={`text-sm leading-relaxed break-words ${isBot ? "text-white" : "text-[#212121]"}`}>
                    {shouldTruncate ? `${content.substring(0, 300)}...` : content}
                  </p>
                  {content.length > 300 && (
                    <button
                      onClick={() => toggleMessageExpansion(message.id)}
                      className="text-xs underline mt-1 opacity-70 hover:opacity-100"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1 px-2 text-[#616161]">
                  {formatTimeInTimezone(message.created_at, botTimezone)}
                </p>
              </div>

              {/* Star button for bot messages (right side) */}
              {isBot && (
                <button className="flex-shrink-0 p-1 rounded transition-colors text-[#616161] hover:text-[#212121] ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Star className="h-4 w-4 text-[#616161]" />
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
