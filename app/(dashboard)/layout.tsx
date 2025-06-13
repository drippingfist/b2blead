"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import MobileHeader from "@/components/mobile-header"
import AuthGuard from "@/components/auth-guard"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Restore sidebar state after page refresh
  useEffect(() => {
    const sidebarWasOpen = localStorage.getItem("sidebarWasOpen")
    if (sidebarWasOpen === "true") {
      console.log("🔄 Restoring sidebar open state after refresh")
      setSidebarOpen(true)
      // Clean up the stored state
      localStorage.removeItem("sidebarWasOpen")
    }
  }, [])

  const handleSidebarClose = () => {
    setSidebarOpen(false)
    // Remove the stored state when manually closing
    localStorage.removeItem("sidebarWasOpen")
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#fdfdfd]">
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
