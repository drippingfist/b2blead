"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InviteHandler() {
  const router = useRouter()

  useEffect(() => {
    // Check if this is an invitation acceptance
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")
    const type = hashParams.get("type")

    if (accessToken && refreshToken && type === "invite") {
      // Redirect to the dedicated password setup page
      router.push(`/auth/set-password${window.location.hash}`)
    }
  }, [router])

  return null
}
