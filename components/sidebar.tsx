"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, MessageSquare, Mail, PhoneCall, Settings, LogOut, X, Shield, User, Crown } from "lucide-react"
import { signOut } from "@/lib/actions"
import { supabase } from "@/lib/supabase/client"
import SimpleBotSelector from "@/components/simple-bot-selector"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Update navigation to hide certain items for members
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  }>({ role: null, accessibleBots: [], isSuperAdmin: false })
  const [firstName, setFirstName] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)

  useEffect(() => {
    // Get current user info and access level
    const getCurrentUser = async () => {
      if (userLoaded) return // Prevent multiple calls

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.warn("Auth error in sidebar:", error.message)
          // Set default values on auth error
          setUserEmail("user@example.com")
          setUserName("User")
        } else if (user) {
          setUserEmail(user.email || null)
          setUserName(user.user_metadata?.name || null)

          // Fetch first_name from user_profiles table
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("first_name")
            .eq("id", user.id)
            .single()

          if (!profileError && profile) {
            setFirstName(profile.first_name)
          }
        }

        // Get user access level
        const { getUserBotAccess } = await import("@/lib/database")
        const access = await getUserBotAccess()
        setUserAccess(access)
      } catch (error) {
        console.warn("Failed to get user in sidebar:", error)
        // Set default values on error
        setUserEmail("user@example.com")
        setUserName("User")
      } finally {
        setUserLoaded(true)
      }
    }

    getCurrentUser()

    // Load selected bot from localStorage
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }
  }, [userLoaded])

  // Get client name when selected bot changes
  useEffect(() => {
    const getClientName = async () => {
      if (selectedBot) {
        try {
          const { data: bot, error } = await supabase
            .from("bots")
            .select("client_name")
            .eq("bot_share_name", selectedBot)
            .single()

          if (!error && bot) {
            setClientName(bot.client_name)
          }
        } catch (error) {
          console.warn("Failed to get client name:", error)
        }
      }
    }

    getClientName()
  }, [selectedBot])

  // Save selected bot to localStorage and trigger page refresh
  const handleBotSelection = (botShareName: string | null) => {
    setSelectedBot(botShareName)
    if (botShareName) {
      localStorage.setItem("selectedBot", botShareName)
    } else {
      localStorage.removeItem("selectedBot")
    }

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent("botSelectionChanged", { detail: botShareName }))
  }

  // Filter navigation based on user role
  const allNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Chats", href: "/chats", icon: MessageSquare }, // Updated to point to /chats
    { name: "Messages", href: "/messages", icon: Mail },
    { name: "Callbacks", href: "/callbacks", icon: PhoneCall },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      adminOnly: true,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      adminOnly: true,
    },
    {
      name: "Admin",
      href: "/admin",
      icon: Shield,
      superAdminOnly: true,
    },
    {
      name: "SuperAdmin",
      href: "/superadmin",
      icon: Crown,
      superAdminOnly: true,
    },
  ]

  // Filter navigation items based on user role
  const navigation = allNavigation.filter((item) => {
    // If item is admin-only and user is member, hide it
    if (item.adminOnly && userAccess.role === "member") {
      return false
    }
    // If item is superadmin-only and user is not superadmin, hide it
    if (item.superAdminOnly && !userAccess.isSuperAdmin) {
      return false
    }
    return true
  })

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

  const displayName = firstName || userName || userEmail?.split("@")[0] || "User"
  const initials = firstName
    ? firstName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userName
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

            {/* Bot selector */}
            <div className="mt-4">
              <SimpleBotSelector selectedBot={selectedBot} onSelectBot={handleBotSelection} />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href)) ||
              (item.href === "/chats" && pathname.startsWith("/thread/")) // Updated for chats page

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
              {firstName && <p className="text-sm font-medium text-[#212121] truncate">{firstName}</p>}
              <p className="text-xs text-[#616161] truncate">{userEmail || "user@example.com"}</p>
              {userAccess.role && <p className="text-xs text-[#038a71] capitalize">{userAccess.role}</p>}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[#616161] hover:text-[#212121] transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
