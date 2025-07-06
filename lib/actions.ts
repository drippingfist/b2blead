"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Please fill out all fields." }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Please fill out all fields." }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function sendMagicLink(prevState: any, formData: FormData) {
  const email = formData.get("email") as string

  if (!email) {
    return { error: "Please enter your email address." }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function refreshSentimentAnalysis(threadId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  // Placeholder implementation - replace with actual sentiment analysis logic
  const { error } = await supabase
    .from("threads")
    .update({ sentiment_score: Math.random() * 2 - 1 })
    .eq("id", threadId)

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}

export async function updateBotBasicInfo(prevState: any, formData: FormData) {
  const botId = formData.get("botId") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string

  if (!botId || !name) {
    return { error: "Bot ID and name are required." }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.from("bots").update({ name, description }).eq("id", botId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function captureSignup(prevState: any, formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const companyUrl = formData.get("companyUrl") as string
  const companyName = formData.get("companyName") as string

  if (!name || !email || !companyName) {
    return { error: "Please fill out all required fields." }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  // 1. Save the data to the 'signups' table
  const { error: insertError } = await supabase.from("signups").insert({
    user_name: name,
    user_email: email,
    client_url: companyUrl,
    client_name: companyName,
  })

  if (insertError) {
    console.error("Error saving signup interest:", insertError)
    return { error: "Could not save your information. Please try again." }
  }

  // 2. Trigger the Gumloop automation
  try {
    const gumloopUrl =
      "https://api.gumloop.com/api/v1/start_pipeline?user_id=dAEhvl9xKdQPUA9YbpNaapCsNzG3&saved_item_id=uRCjE6Qktv8CVW1GFcR3dH"
    const gumloopApiKey = process.env.GUMLOOP_API_KEY

    if (!gumloopApiKey) {
      console.error("GUMLOOP_API_KEY is not set. Skipping automation trigger.")
      // Return success even if this part fails to not block the user.
      return { success: true }
    }

    const response = await fetch(gumloopUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gumloopApiKey}`,
      },
      body: JSON.stringify({ user_email: email }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Gumloop API error:", response.status, errorBody)
    }
  } catch (gumloopError) {
    console.error("Failed to trigger Gumloop automation:", gumloopError)
  }

  return { success: true }
}
