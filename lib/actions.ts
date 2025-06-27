"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

// Update the signIn function to handle redirects properly
export async function signIn(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    // Return success instead of redirecting directly
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Simplified signUp function - Supabase handles invitations automatically
export async function signUp(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.auth.signOut()
  redirect("/auth/login")
}

// New server action to refresh sentiment analysis
export async function refreshSentimentAnalysis(threadId: string) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // First, set sentiment_score to null
    const { error: updateError } = await supabase
      .from("threads")
      .update({
        sentiment_score: null,
        sentiment_justification: null,
        // Note: We're not updating updated_at, it will remain unchanged
      })
      .eq("id", threadId)

    if (updateError) {
      return { error: `Error updating thread: ${updateError.message}` }
    }

    // Wait 0.5 seconds
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Call the new edge function that processes all NULL sentiment threads
    const response = await fetch("https://bhekqolukbxkxjloffdi.supabase.co/functions/v1/sentimentanalysis_button", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    })

    if (!response.ok) {
      return { error: `Sentiment analysis failed: ${response.statusText}` }
    }

    return { success: "Sentiment analysis started! The score will update shortly." }
  } catch (error: any) {
    return { error: `Unexpected error: ${error.message}` }
  }
}

// Updated to use implicit flow instead of PKCE
export async function sendMagicLink(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")

  // Validate required fields
  if (!email) {
    return { error: "Email is required" }
  }

  try {
    // CORRECT: Use the standard server action client
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email.toString(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) {
      console.error("Password reset error:", error.message)
      return { error: error.message }
    }

    // Return success message
    return { success: "If an account with that email exists, we've sent you a password reset link." }
  } catch (error) {
    console.error("Password reset error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// New server action to update bot basic information
export async function updateBotBasicInfo(
  botShareName: string,
  data: {
    client_name: string
    client_description: string
    timezone: string
  },
) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  // Security check: Only allow superadmins to perform this action
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: isSuperAdmin, error: rpcError } = await supabase.rpc("is_superadmin")

  if (rpcError || !isSuperAdmin) {
    return { error: "Insufficient permissions. Superadmin required." }
  }

  // Perform the update
  const { error } = await supabase
    .from("bots")
    .update({
      client_name: data.client_name,
      client_description: data.client_description,
      timezone: data.timezone,
    })
    .eq("bot_share_name", botShareName)

  if (error) {
    return { error: `Failed to update bot: ${error.message}` }
  }

  // Revalidate the path to ensure the data is fresh on the page
  revalidatePath(`/demos/${botShareName}`)

  return { success: true }
}
