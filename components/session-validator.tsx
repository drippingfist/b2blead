"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
// We can use the base supabase client, no need for the retry wrapper here.
import { supabase } from "@/lib/supabase/client"

export function SessionValidator() {
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // This event fires on sign-in, sign-out, and token refresh.
      // We are only interested in the SIGNED_OUT event to redirect the user.
      if (event === "SIGNED_OUT") {
        console.log("🔑 SessionValidator: User signed out. Redirecting to login.")
        // Using router.replace to avoid adding a new entry to the history stack
        router.replace("/auth/login")
      }
    })

    // The cleanup function unsubscribes from the listener when the component unmounts.
    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // This component doesn't render anything, it's just for session logic.
  return null
}
