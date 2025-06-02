"use client"

import { MessagesView } from "@/components/messages-view"

interface MessagesPageClientProps {
  threadsWithMessages: any[]
  bots: any[]
  selectedBot: string | null
  selectedDate: string | null
}

export function MessagesPageClient({ threadsWithMessages, bots, selectedBot, selectedDate }: MessagesPageClientProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Messages Content - Full Width */}
      <div className="flex-1 flex flex-col">
        <MessagesView
          threadsWithMessages={threadsWithMessages}
          bots={bots}
          selectedBot={selectedBot}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  )
}
