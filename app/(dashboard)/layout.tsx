"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import MobileHeader from "@/components/mobile-header"
import { supabase } from "@/lib/supabase/client"
import Loading from "@/components/loading"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  // Check authentication and authorization
  useEffect(() => {
    const checkAuthAndAccess = async () => {
      try {
        setIsLoading(true)

        // Step 1: Check if user is authenticated
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          console.log("User not authenticated, redirecting to login")
          router.push("/auth/login")
          return
        }

        // Step 2: Check if user has a record in bot_users
        const { data: botUser, error: botUserError } = await supabase
          .from("bot_users")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (botUserError || !botUser) {
          console.log("User not found in bot_users, redirecting to login")
          // Sign out the user since they don't have proper access
          await supabase.auth.signOut()
          router.push("/auth/login")
          return
        }

        // User is authenticated and authorized
        setIsAuthorized(true)
      } catch (error) {
        console.error("Error checking authentication and access:", error)
        router.push("/auth/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndAccess()
  }, [router])

  // Restore sidebar state after page refresh
  useEffect(() => {
    if (!isAuthorized) return

    const sidebarWasOpen = localStorage.getItem("sidebarWasOpen")
    if (sidebarWasOpen === "true") {
      console.log("🔄 Restoring sidebar open state after refresh")
      setSidebarOpen(true)
      // Clean up the stored state
      localStorage.removeItem("sidebarWasOpen")
    }
  }, [isAuthorized])

  const handleSidebarClose = () => {
    setSidebarOpen(false)
    // Remove the stored state when manually closing
    localStorage.removeItem("sidebarWasOpen")
  }

  // Show loading state while checking authentication and authorization
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfdfd]">
        <Loading />
      </div>
    )
  }

  // Only render the dashboard if user is authorized
  if (!isAuthorized) {
    return null // This will never actually render because we redirect in the useEffect
  }

  return (
    <div className="flex h-screen bg-[#fdfdfd]">
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
