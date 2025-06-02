"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Clock,
  Phone,
  Mail,
  Building,
  MapPin,
  Star,
  MessageSquare,
} from "lucide-react"
import { formatDateInTimezone, formatTimeInTimezone } from "@/lib/timezone-utils"
import type { Thread, Message, Callback } from "@/lib/database"

interface MessageWithThread extends Message {
  thread?: Thread
}

interface MessageThreadProps {
  thread: Thread
  messages: MessageWithThread[]
  callbacks: Callback[]
}

export function MessageThread({ thread, messages, callbacks }: MessageThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getSentimentEmoji = (sentiment?: number) => {
    if (!sentiment) return "😐"
    if (sentiment >= 0.7) return "😊"
    if (sentiment >= 0.3) return "😐"
    return "😞"
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return "N/A"
    return duration
  }

  // Sort messages by creation time
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const firstMessage = sortedMessages[0]
  const lastMessage = sortedMessages[sortedMessages.length - 1]
  const hasCallback = callbacks.length > 0
  const callback = callbacks[0] // Take the first callback if multiple exist

  return (
    <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
      {/* Thread Header */}
      <div
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-[#038a71]" />
              <span className="font-medium text-[#212121]">Thread {thread.thread_id || thread.id}</span>
              {thread.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
            </div>

            <div className="flex items-center space-x-4 text-sm text-[#616161]">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDateInTimezone(thread.created_at)}</span>
              </div>

              <div className="flex items-center space-x-1">
                <span>{getSentimentEmoji(thread.sentiment_score)}</span>
                <span>Sentiment</span>
              </div>

              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{messages.length} messages</span>
              </div>

              {hasCallback && (
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4 text-[#038a71]" />
                  <span className="text-[#038a71] font-medium">Callback Requested</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-[#616161]">Duration: {formatDuration(thread.duration)}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-[#616161]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[#616161]" />
            )}
          </div>
        </div>

        {/* Thread Preview */}
        {!isExpanded && (
          <div className="mt-2 text-sm text-[#616161]">
            <p className="truncate">
              {thread.message_preview ||
                firstMessage?.user_message ||
                firstMessage?.bot_message ||
                "No preview available"}
            </p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#e0e0e0]">
          {/* Callback Information */}
          {hasCallback && callback && (
            <div className="p-4 bg-blue-50 border-b border-[#e0e0e0]">
              <h4 className="font-medium text-[#212121] mb-2 flex items-center">
                <Phone className="h-4 w-4 mr-2 text-[#038a71]" />
                Callback Request Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  {(callback.user_name || callback.user_first_name || callback.user_surname) && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-[#616161]" />
                      <span>
                        {callback.user_name ||
                          `${callback.user_first_name || ""} ${callback.user_surname || ""}`.trim() ||
                          "Anonymous"}
                      </span>
                    </div>
                  )}
                  {callback.user_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-[#616161]" />
                      <span>{callback.user_email}</span>
                    </div>
                  )}
                  {callback.user_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-[#616161]" />
                      <span>{callback.user_phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {callback.user_company && (
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-[#616161]" />
                      <span>{callback.user_company}</span>
                    </div>
                  )}
                  {callback.user_country && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-[#616161]" />
                      <span>{callback.user_country}</span>
                    </div>
                  )}
                </div>
              </div>
              {callback.user_cb_message && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <p className="text-sm text-[#212121]">{callback.user_cb_message}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {sortedMessages.map((message, index) => (
              <div key={message.id} className="space-y-3">
                {/* User Message */}
                {message.user_message && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-[#212121]">
                          {message.user_name || message.user_email || "User"}
                        </span>
                        <span className="text-xs text-[#616161]">{formatTimeInTimezone(message.created_at)}</span>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-[#212121]">{message.user_message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot Message */}
                {message.bot_message && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[#038a71] rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-[#212121]">Bot</span>
                        <span className="text-xs text-[#616161]">{formatTimeInTimezone(message.created_at)}</span>
                        {message.sentiment_analysis && (
                          <span className="text-xs text-[#616161]">
                            {getSentimentEmoji(message.sentiment_analysis)}
                            {message.sentiment_analysis.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-[#212121]">{message.bot_message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
