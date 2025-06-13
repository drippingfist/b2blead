"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabaseWithRetry } from "@/lib/supabase/client"

export function SessionValidator() {
  const router = useRouter()
  const isCheckingRef = useRef(false)
  const lastCheckTimeRef = useRef(0)
  const MIN_CHECK_INTERVAL = 10000 // 10 seconds between checks to prevent excessive API calls

  // Function to validate the session
  const validateSession = async () => {
    // Prevent concurrent checks and rate limit checks
    const now = Date.now()
    if (isCheckingRef.current || now - lastCheckTimeRef.current < MIN_CHECK_INTERVAL) {
      return
    }

    try {
      isCheckingRef.current = true
      lastCheckTimeRef.current = now

      console.log("🔒 Validating session after tab focus")
      const { data, error } = await supabaseWithRetry.auth.getSession()

      if (error) {
        console.error("Session validation error:", error)
        router.push("/auth/login")
        return
      }

      if (!data.session) {
        console.log("🔑 No active session found, redirecting to login")
        router.push("/auth/login")
      }
    } catch (err) {
      console.error("Failed to validate session:", err)
      // Don't redirect on network errors to prevent disrupting user experience
    } finally {
      isCheckingRef.current = false
    }
  }

  useEffect(() => {
    // Only run this effect in the browser
    if (typeof window === "undefined") return

    // Handler for visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSession()
      }
    }

    // Add event listener
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  // This component doesn't render anything
  return null
}
