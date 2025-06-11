import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ChatsPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get threads for this user
  const { data: threads, error } = await supabase
    .from("threads")
    .select(`
      id,
      thread_id,
      created_at,
      updated_at,
      message_preview,
      count,
      bot_share_name,
      bots(bot_display_name, client_name)
    `)
    .gt("count", 0)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching threads:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
        <p className="text-gray-600 mt-1">{threads?.length || 0} conversations found</p>
      </div>

      <div className="space-y-4">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">Thread {thread.thread_id || thread.id.slice(0, 8)}</h3>
                <span className="text-sm text-gray-500">{new Date(thread.updated_at).toLocaleDateString()}</span>
              </div>

              <p className="text-gray-600 text-sm mb-2">{thread.message_preview || "No preview available"}</p>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{thread.count} messages</span>
                <span>{thread.bots?.client_name || thread.bots?.bot_display_name || thread.bot_share_name}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No chats found</p>
          </div>
        )}
      </div>
    </div>
  )
}
