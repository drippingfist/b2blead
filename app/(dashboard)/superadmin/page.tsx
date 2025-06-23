"use client"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SuperAdminClient from "./superadmin-client" // The renamed component

interface BotSettings {
  timezone: string
  client_description: string
  client_url: string
  client_email: string
  sentiment_analysis_prompt: string
  client_email_name: string
  gpt_assistant_system_prompt: string
  button_background_colour: string
  button_gif_url: string
  favicon_png: string
  callback_completed_gif: string
  product_name: string
}

async function checkSuperAdminAccess() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  // Check the bot_super_users table
  const { data: superAdmin, error } = await supabase.from("bot_super_users").select("id").eq("id", user.id).single()

  return !!superAdmin
}

export default async function SuperAdminPage() {
  const isSuperAdmin = await checkSuperAdminAccess()

  if (!isSuperAdmin) {
    redirect("/dashboard") // Or any other appropriate page
  }

  // If check passes, render the client component
  return <SuperAdminClient />
}
