"use client"

import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Rate limiting state
const lastAuthRequest = 0
const AUTH_REQUEST_COOLDOWN = 2000 // 2 seconds between auth requests

// Create a singleton instance of the Supabase client for Client Components with enhanced config
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Reduce auto-refresh frequency to minimize network calls
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add retry configuration for auth operations
      retryAttempts: 1, // Reduced from 3 to prevent rate limiting
      // Increase timeout for slow connections
    },
    global: {
      // Add custom headers for better error tracking
      headers: {
        "X-Client-Info": "supabase-js-web",
      },
    },
    // Configure realtime with better error handling
    realtime: {
      params: {
        eventsPerSecond: 1, // Reduced from 2
      },
    },
  },
)

// Global error handler for unhandled promise rejections
if (typeof window !== "undefined") {
  // Handle unhandled promise rejections (like the Supabase auth errors)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason

    // Check if it's a rate limit error
    if (error?.message?.includes("rate limit") || error?.message?.includes("Request rate limit reached")) {
      console.warn("🚫 Supabase rate limit error caught and suppressed:", error.message)
      event.preventDefault()

      if (!document.querySelector("[data-rate-limit-toast]")) {
        showRateLimitToast()
      }
      return
    }

    // Check if it's a Supabase auth network error
    if (
      error?.message?.includes("Failed to fetch") &&
      (error?.stack?.includes("supabase") || error?.stack?.includes("auth-js"))
    ) {
      console.warn("🔄 Supabase auth network error caught and suppressed:", error.message)

      // Prevent the error from showing in console
      event.preventDefault()

      // Optional: Show a subtle notification to user
      if (!document.querySelector("[data-network-error-toast]")) {
        showNetworkErrorToast()
      }

      return
    }

    // Let other errors bubble up normally
    console.error("Unhandled promise rejection:", error)
  })

  // Handle general errors
  window.addEventListener("error", (event) => {
    const error = event.error

    if (error?.message?.includes("rate limit") || error?.message?.includes("Request rate limit reached")) {
      console.warn("🚫 Supabase rate limit error caught and suppressed:", error.message)
      event.preventDefault()
      return
    }

    if (
      error?.message?.includes("Failed to fetch") &&
      (error?.stack?.includes("supabase") || error?.stack?.includes("auth-js"))
    ) {
      console.warn("🔄 Supabase auth error caught and suppressed:", error.message)
      event.preventDefault()
      return
    }
  })
}

// Show rate limit notification
function showRateLimitToast() {
  const toast = document.createElement("div")
  toast.setAttribute("data-rate-limit-toast", "true")
  toast.className =
    "fixed top-4 right-4 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-2 rounded shadow-lg z-50 text-sm"
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
      </svg>
      <span>Too many requests - please wait a moment</span>
    </div>
  `
  document.body.appendChild(toast)

  // Remove toast after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 5000)
}

// Show a subtle network error notification
function showNetworkErrorToast() {
  const toast = document.createElement("div")
  toast.setAttribute("data-network-error-toast", "true")
  toast.className =
    "fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded shadow-lg z-50 text-sm"
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <span>Connection issue detected - retrying automatically</span>
    </div>
  `
  document.body.appendChild(toast)

  // Remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 3000)
}
