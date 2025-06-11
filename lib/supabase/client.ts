import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client for Client Components
export const supabase = createClientComponentClient()

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
