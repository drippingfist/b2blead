import { getThreadById, getMessagesByThreadId } from "@/lib/database"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, User, MessageSquare, Phone, Info } from "lucide-react"

export default async function ThreadDetailPage({ params }: { params: { id: string } }) {
  const threadId = params.id

  // Add this function to database.ts
  const thread = await getThreadById(threadId)

  if (!thread) {
    notFound()
  }

  const messages = await getMessagesByThreadId(thread.thread_id || "")

  const getSentimentEmoji = (sentiment?: number) => {
    if (sentiment === undefined || sentiment === null) return "😐"
    if (sentiment >= 7) return "😊"
    if (sentiment >= 4) return "😐"
    return "😞"
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return "00:00:00"

    // Parse PostgreSQL interval format
    const match = duration.match(/(\d+):(\d+):(\d+)/)
    if (match) {
      const [, hours, minutes, seconds] = match
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
    }

    return duration
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-[#616161] hover:text-[#212121] mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to chats
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-[#212121]">Thread Details</h1>
          <div className="flex items-center mt-2 md:mt-0">
            <Clock className="h-4 w-4 text-[#616161] mr-1" />
            <span className="text-sm text-[#616161]">Duration: {formatDuration(thread.duration)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm mb-6">
            <h2 className="text-lg font-medium text-[#212121] mb-4">Conversation</h2>

            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex flex-col space-y-2">
                    {message.user_message && (
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-[#616161]" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm text-[#212121]">{message.user_message}</p>
                        </div>
                      </div>
                    )}

                    {message.bot_message && (
                      <div className="flex items-start justify-end">
                        <div className="bg-[#038a71]/10 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm text-[#212121]">{message.bot_message}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#038a71]/20 flex items-center justify-center ml-3">
                          <MessageSquare className="h-4 w-4 text-[#038a71]" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#616161]">No messages found for this thread.</p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm mb-6">
            <h2 className="text-lg font-medium text-[#212121] mb-4">Thread Information</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#616161]">Thread ID</p>
                <p className="text-sm font-mono text-[#212121]">{thread.thread_id || "N/A"}</p>
              </div>

              <div>
                <p className="text-sm text-[#616161]">Bot ID</p>
                <p className="text-sm font-mono text-[#212121]">{thread.bot_id || "N/A"}</p>
              </div>

              <div>
                <p className="text-sm text-[#616161]">Created At</p>
                <p className="text-sm text-[#212121]">
                  {new Date(thread.created_at).toLocaleString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-[#616161]">Last Updated</p>
                <p className="text-sm text-[#212121]">
                  {new Date(thread.updated_at).toLocaleString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center">
                <p className="text-sm text-[#616161] mr-2">Sentiment Score</p>
                <span className="text-xl">{getSentimentEmoji(thread.sentiment_score)}</span>
                <span className="text-sm ml-2 font-medium">
                  {thread.sentiment_score !== undefined && thread.sentiment_score !== null
                    ? thread.sentiment_score
                    : "N/A"}
                </span>
              </div>

              {thread.sentiment_justification && (
                <div>
                  <p className="text-sm text-[#616161] flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    Sentiment Analysis
                  </p>
                  <p className="text-sm text-[#212121] mt-1">{thread.sentiment_justification}</p>
                </div>
              )}

              {thread.cb_requested && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-sm font-medium text-orange-800 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Callback Requested
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
            <h2 className="text-lg font-medium text-[#212121] mb-4">Actions</h2>

            <div className="space-y-3">
              <button className="w-full bg-[#038a71] hover:bg-[#038a71]/90 text-white px-4 py-2 rounded-md text-sm">
                Schedule Callback
              </button>
              <button className="w-full border border-[#e0e0e0] hover:bg-gray-50 text-[#616161] px-4 py-2 rounded-md text-sm">
                Export Conversation
              </button>
              <button className="w-full border border-[#e0e0e0] hover:bg-gray-50 text-[#616161] px-4 py-2 rounded-md text-sm">
                Archive Thread
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
