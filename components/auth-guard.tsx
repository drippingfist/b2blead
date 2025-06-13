"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import Loading from "@/components/loading"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuthAndAccess = async () => {
      try {
        // Step 1: Check if user is authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !sessionData.session) {
          console.log("User not authenticated, redirecting to login")
          router.push("/auth/login")
          return
        }

        const userId = sessionData.session.user.id

        // Step 2: Check if user has a record in bot_users
        try {
          const { data: botUser, error: botUserError } = await supabase
            .from("bot_users")
            .select("*")
            .eq("user_id", userId)
            .single()

          if (botUserError || !botUser) {
            console.log("User not found in bot_users, redirecting to login")
            // Sign out the user since they don't have proper access
            await supabase.auth.signOut()
            router.push("/auth/login")
            return
          }

          // User is authenticated and authorized
          if (isMounted) {
            setIsAuthorized(true)
            setIsLoading(false)
          }
        } catch (dbError) {
          console.error("Error checking bot_users:", dbError)
          if (isMounted) {
            // Handle database errors gracefully
            router.push("/auth/login?error=database")
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        if (isMounted) {
          // Handle auth errors gracefully
          router.push("/auth/login?error=auth")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Add a small delay to ensure client-side execution
    const timeoutId = setTimeout(() => {
      checkAuthAndAccess()
    }, 100)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfdfd]">
        <Loading />
      </div>
    )
  }

  if (!isAuthorized) {
    return null // This will never actually render because we redirect in the useEffect
  }

  return <>{children}</>
}
