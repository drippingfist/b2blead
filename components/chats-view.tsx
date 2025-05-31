"use client"

import { useState } from "react"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Star,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { Message } from "@/lib/database"

interface ChatsViewProps {
  initialMessages: Message[]
}

export default function ChatsView({ initialMessages }: ChatsViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [chatIdEnabled, setChatIdEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = new Date(message.created_at).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  // Filter messages based on search query
  const filteredMessages = searchQuery
    ? messages.filter(
        (msg) =>
          msg.user_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.bot_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          msg.user_email?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages

  const getSentimentEmoji = (sentiment?: number) => {
    if (!sentiment) return "😐"
    if (sentiment >= 0.7) return "😊"
    if (sentiment >= 0.3) return "😐"
    return "😞"
  }

  const formatDuration = (createdAt: string) => {
    // This is a placeholder - you might want to calculate actual conversation duration
    return "00:02:30"
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Chats</h1>
          <p className="text-[#616161]">View all your messages with your customers.</p>
        </div>
        <Button className="bg-[#038a71] hover:bg-[#038a71]/90 w-full md:w-auto">Export</Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
          <input
            type="text"
            placeholder="Search for message"
            className="pl-10 pr-4 py-2 w-full border border-[#e0e0e0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#038a71]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-[#616161] mr-2" />
            <span className="text-sm text-[#616161]">Filters</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <span className="text-sm text-[#616161]">Last 30 days</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-sm text-[#616161]">
              1 - {Math.min(50, filteredMessages.length)} of {filteredMessages.length}
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-[#616161]" />
              </button>
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronRight className="h-5 w-5 text-[#616161]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile pagination */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <div className="text-sm text-[#616161]">
          1 - {Math.min(50, filteredMessages.length)} of {filteredMessages.length}
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded-md hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-[#616161]" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100">
            <ChevronRight className="h-5 w-5 text-[#616161]" />
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Time
                  <ChevronDown className="h-4 w-4 ml-1" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Sentiment
                  <Info className="h-4 w-4 ml-1 text-[#616161]" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Message Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>Actions</span>
                  <Switch checked={chatIdEnabled} onCheckedChange={setChatIdEnabled} className="ml-2" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <>
                <tr key={`date-${date}`} className="bg-gray-50">
                  <td colSpan={6} className="px-6 py-2 text-sm font-medium text-[#616161]">
                    {date}
                  </td>
                </tr>
                {dateMessages.slice(0, 10).map((message) => (
                  <tr key={message.id} className="bg-white hover:bg-[#f5f5f5] border-t border-[#e0e0e0]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {message.user_name || message.user_email ? (
                        <div>
                          <div className="text-sm font-medium text-[#212121]">{message.user_name || "Anonymous"}</div>
                          <div className="text-xs text-[#616161]">{message.user_email}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-[#616161]">Anonymous</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl">{getSentimentEmoji(message.sentiment_analysis)}</span>
                        <span className="text-[#616161] ml-1">...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-sm text-[#212121]">
                      {message.user_message || message.bot_message || "No message"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      {formatDuration(message.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-[#616161] hover:text-[#212121]">
                        <Star className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={`mobile-date-${date}`}>
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-[#616161] rounded-t-md border border-[#e0e0e0]">
              {date}
            </div>
            <div className="space-y-2">
              {dateMessages.slice(0, 10).map((message) => (
                <div
                  key={`mobile-${message.id}`}
                  className="bg-white border border-[#e0e0e0] border-t-0 last:rounded-b-md p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-[#212121]">
                        {new Date(message.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xl">{getSentimentEmoji(message.sentiment_analysis)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-[#616161] hover:text-[#212121]">
                        <Star className="h-4 w-4" />
                      </button>
                      <button className="text-[#616161] hover:text-[#212121]">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {(message.user_name || message.user_email) && (
                    <div className="mb-2">
                      <div className="text-sm font-medium text-[#212121]">{message.user_name || "Anonymous"}</div>
                      <div className="text-xs text-[#616161]">{message.user_email}</div>
                    </div>
                  )}

                  <div className="text-sm text-[#212121] mb-2">
                    {message.user_message || message.bot_message || "No message"}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#616161]">
                      Duration: <span className="text-[#212121]">{formatDuration(message.created_at)}</span>
                    </span>
                    {message.sentiment_analysis && (
                      <span className="text-[#616161]">
                        Score: <span className="text-[#212121]">{message.sentiment_analysis.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#616161]">No messages found.</p>
        </div>
      )}
    </div>
  )
}
