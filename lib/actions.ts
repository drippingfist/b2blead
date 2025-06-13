"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

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

// Update the signOut function to ensure proper redirection
export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    await supabase.auth.signOut()
    // Make sure we're redirecting to the login page after successful logout
    return redirect("/auth/login")
  } catch (error) {
    console.error("Error during sign out:", error)
    // Even if there's an error, redirect to login
    return redirect("/auth/login")
  }
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

// Fix the sendMagicLink function to work with the updated form
export async function sendMagicLink(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const redirectTo = formData.get("redirect_to") || "/"

  // Validate required fields
  if (!email) {
    return { error: "Email is required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Construct the callback URL with the redirect_to parameter
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const callbackUrl = new URL("/auth/callback", siteUrl)

    // Add the redirect_to parameter to the callback URL
    if (redirectTo) {
      callbackUrl.searchParams.set("redirect_to", redirectTo.toString())
    }

    console.log("🔗 Magic link callback URL:", callbackUrl.toString())

    // Send magic link with the callback URL
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toString(),
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (error) {
      console.error("❌ Magic link error:", error.message)
      return { error: error.message }
    }

    // Always return success message to prevent email enumeration
    return { success: "If an account with that email exists, we've sent you a magic link." }
  } catch (error) {
    console.error("❌ Magic link error:", error)
    return { success: "If an account with that email exists, we've sent you a magic link." }
  }
}
