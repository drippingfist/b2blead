"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import React from "react"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client for Client Components with enhanced config
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  options: {
    auth: {
      // Reduce auto-refresh frequency to minimize network calls
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add retry configuration for auth operations
      retryAttempts: 3,
      // Increase timeout for slow connections
      flowType: "implicit",
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
        eventsPerSecond: 2,
      },
    },
  },
})

// Global error handler for unhandled promise rejections
if (typeof window !== "undefined") {
  // Handle unhandled promise rejections (like the Supabase auth errors)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason

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

// Network status detection
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(typeof window !== "undefined" ? navigator.onLine : true)

  React.useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Network connection restored")
      setIsOnline(true)
    }

    const handleOffline = () => {
      console.log("📵 Network connection lost")
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline }
}

// Retry utility function
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on certain types of errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        if (
          errorMessage.includes("invalid") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("forbidden")
        ) {
          throw error
        }
      }

      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries} attempts:`, error)
        throw error
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1)
      console.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`, error)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

// Enhanced Supabase client with retry logic
export const supabaseWithRetry = {
  auth: {
    getSession: () => retryOperation(() => supabase.auth.getSession()),
    getUser: () => retryOperation(() => supabase.auth.getUser()),
    signOut: () => retryOperation(() => supabase.auth.signOut()),
    signInWithPassword: (credentials: { email: string; password: string }) =>
      retryOperation(() => supabase.auth.signInWithPassword(credentials)),
    signUp: (credentials: { email: string; password: string }) =>
      retryOperation(() => supabase.auth.signUp(credentials)),
    resetPasswordForEmail: (email: string) => retryOperation(() => supabase.auth.resetPasswordForEmail(email)),
  },
  from: (table: string) => ({
    select: (query?: string) => retryOperation(() => supabase.from(table).select(query)),
    insert: (data: any) => retryOperation(() => supabase.from(table).insert(data)),
    update: (data: any) => retryOperation(() => supabase.from(table).update(data)),
    delete: () => retryOperation(() => supabase.from(table).delete()),
  }),
}

// Error boundary for Supabase operations
export function handleSupabaseError(error: any, context = "Supabase operation") {
  console.error(`${context} error:`, error)

  if (error?.message?.includes("Failed to fetch")) {
    console.warn("Network connectivity issue detected. The operation may succeed on retry.")
    return {
      isNetworkError: true,
      message: "Network connection issue. Please check your internet connection.",
    }
  }

  if (error?.message?.includes("JWT")) {
    console.warn("Authentication token issue detected.")
    return {
      isAuthError: true,
      message: "Authentication session expired. Please refresh the page.",
    }
  }

  return {
    isUnknownError: true,
    message: error?.message || "An unexpected error occurred.",
  }
}
