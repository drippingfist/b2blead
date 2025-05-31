"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  PhoneCall,
  MessageSquarePlus,
  Settings,
  LogOut,
  X,
  Bot,
} from "lucide-react"
import { signOut } from "@/lib/actions"
import { supabase } from "@/lib/supabase/client"
import BotSelector from "@/components/bot-selector"
import { useBotContext } from "@/contexts/bot-context"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const { selectedBot, setSelectedBot } = useBotContext()

  useEffect(() => {
    // Get current user info
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || null)
        setUserName(user.user_metadata?.name || null)
      }
    }
    getCurrentUser()
  }, [])

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Chats", href: "/", icon: MessageSquare },
    { name: "Bots", href: "/bots", icon: Bot },
    { name: "Callbacks", href: "/callbacks", icon: PhoneCall },
    { name: "Messages", href: "/messages", icon: Mail },
    { name: "Chat Improvements", href: "/improvements", icon: MessageSquarePlus },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  // Close sidebar when clicking on a link on mobile
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar")
      const target = event.target as Node

      if (sidebar && !sidebar.contains(target) && isOpen && window.innerWidth < 768) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  const displayName = userName || userEmail?.split("@")[0] || "User"
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() || "U"

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        id="mobile-sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-60 
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          border-r border-[#e0e0e0] flex flex-col h-full bg-white
        `}
      >
        <div className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center" onClick={handleLinkClick}>
                <img src="/logo.svg" alt="b2bLEAD.ai" className="h-12 w-auto" />
              </Link>
              {/* Close button for mobile */}
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-md text-[#616161] hover:text-[#212121] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bot selector underneath the logo */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#616161] mb-2">Select Bot</label>
              <BotSelector selectedBot={selectedBot} onSelectBot={setSelectedBot} />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={`
                  flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors
                  ${isActive ? "bg-[#038a71]/10 text-[#038a71]" : "text-[#616161] hover:bg-gray-100 hover:text-[#212121]"}
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-[#038a71]" : "text-[#616161]"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#e0e0e0]">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#038a71] text-white flex items-center justify-center mr-3">
              <span className="font-medium text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#212121] truncate">{displayName}</p>
              <p className="text-xs text-[#616161] truncate">{userEmail || "user@example.com"}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className="text-[#616161] hover:text-[#212121] transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
