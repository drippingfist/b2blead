import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, PhoneCall } from "lucide-react"
import Link from "next/link"
import ChatMessages from "./chat-messages"

export default async function ChatDetailPage({ params }: { params: { threadId: string } }) {
  const { threadId } = params
  const supabase = createServerComponentClient({ cookies })

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user's email
  const userEmail = session.user.email

  // Get thread details
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select(`
      *,
      bots(client_name, client_url)
    `)
    .eq("thread_id", threadId)
    .single()

  if (threadError || !thread) {
    notFound()
  }

  // Check if user has access to this bot
  const { data: userAccess } = await supabase
    .from("bot_users")
    .select("*")
    .eq("user_email", userEmail)
    .eq("bot_share_name", thread.bot_share_name)
    .eq("is_active", true)
    .single()

  if (!userAccess) {
    redirect("/chats")
  }

  // Get messages for this thread
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (messagesError) {
    console.error("Error fetching messages:", messagesError)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/chats">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{thread.bots?.client_name || thread.bot_share_name}</h1>
            {thread.bots?.client_url && (
              <a
                href={thread.bots.client_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {thread.bots.client_url}
              </a>
            )}
          </div>
        </div>

        {thread.cb_requested && (
          <Button variant="outline" className="gap-2">
            <PhoneCall className="h-4 w-4" />
            Callback Requested
          </Button>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Sentiment Score</p>
            <p className="text-lg font-semibold">{thread.sentiment_score}/10</p>
          </div>
          {thread.sentiment_justification && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Sentiment Analysis</p>
              <p className="text-sm">{thread.sentiment_justification}</p>
            </div>
          )}
        </div>
      </div>

      <ChatMessages messages={messages || []} />
    </div>
  )
}
