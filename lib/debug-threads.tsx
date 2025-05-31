"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export default function DebugThreads() {
  const [debugInfo, setDebugInfo] = useState<any>({
    loading: true,
    user: null,
    accessibleBots: [],
    threads: [],
    error: null,
  })

  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError) throw userError

        // Get user's bots
        let accessibleBots: string[] = []

        if (user?.email === "james@vrg.asia") {
          // Super admin gets all bots
          const { data: bots, error: botsError } = await supabase
            .from("bots")
            .select("bot_share_name")
            .not("bot_share_name", "is", null)

          if (botsError) throw botsError
          accessibleBots = bots.map((b) => b.bot_share_name).filter(Boolean)
        } else if (user?.email) {
          // Regular users get bots they have access to
          const { data: botUsers, error: botUsersError } = await supabase
            .from("bot_users")
            .select("bot_share_name")
            .eq("user_email", user.email)
            .eq("is_active", true)

          if (botUsersError) throw botUsersError
          accessibleBots = botUsers.map((bu) => bu.bot_share_name).filter(Boolean)
        }

        // Get threads
        let threadsQuery = supabase.from("threads").select("*").order("updated_at", { ascending: false }).limit(10)

        if (accessibleBots.length > 0) {
          threadsQuery = threadsQuery.in("bot_share_name", accessibleBots)
        }

        const { data: threads, error: threadsError } = await threadsQuery
        if (threadsError) throw threadsError

        setDebugInfo({
          loading: false,
          user,
          accessibleBots,
          threads,
          error: null,
        })
      } catch (error) {
        console.error("Debug error:", error)
        setDebugInfo((prev) => ({
          ...prev,
          loading: false,
          error,
        }))
      }
    }

    fetchDebugInfo()
  }, [])

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => {
          console.log("Debug info:", debugInfo)
          alert(`Found ${debugInfo.threads.length} threads. Check console for details.`)
        }}
        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm"
      >
        Debug Threads ({debugInfo.threads.length})
      </button>
    </div>
  )
}
