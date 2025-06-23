"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { timezones } from "@/lib/timezones"
import { Upload, Save, ImageIcon } from "lucide-react"
import Loading from "@/components/loading"
import { useBotSelection } from "@/hooks/use-bot-selection"

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

export default function SuperAdminClient() {
  const { selectedBot, isSelectionLoaded } = useBotSelection()
  const [clientName, setClientName] = useState<string>("")
  const [botSettings, setBotSettings] = useState<BotSettings>({
    timezone: "",
    client_description: "",
    client_url: "",
    client_email: "",
    sentiment_analysis_prompt: "",
    client_email_name: "",
    gpt_assistant_system_prompt: "",
    button_background_colour: "#038a71",
    button_gif_url: "",
    favicon_png: "",
    callback_completed_gif: "",
    product_name: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<{
    gif: boolean
    favicon: boolean
    callback: boolean
  }>({ gif: false, favicon: false, callback: false })

  // Load bot data when selected bot changes
  useEffect(() => {
    const loadBotData = async () => {
      if (!isSelectionLoaded) {
        return
      }

      if (!selectedBot) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setDebugInfo(null)
      setImageErrors({ gif: false, favicon: false, callback: false })

      try {
        console.log("Loading bot data for:", selectedBot)

        const { data: bot, error: botError } = await supabase
          .from("bots")
          .select("*")
          .eq("bot_share_name", selectedBot)
          .single()

        if (botError) {
          throw new Error(`Failed to load bot data: ${botError.message}`)
        }

        if (bot) {
          console.log("Bot data loaded:", bot)
          console.log("Timezone from database:", bot.timezone)
          console.log("Button background colour:", bot.button_background_colour)
          console.log("Button GIF URL:", bot.button_gif_url)
          console.log("Favicon PNG:", bot.favicon_png)
          console.log("Callback completed GIF:", bot.callback_completed_gif)

          // Debug info to display on the page
          setDebugInfo(
            `Bot: ${selectedBot}, Button GIF URL: "${bot.button_gif_url || "empty"}", Favicon PNG: "${
              bot.favicon_png || "empty"
            }", Callback GIF: "${bot.callback_completed_gif || "empty"}"`,
          )

          setClientName(bot.client_name || "")

          const newSettings = {
            timezone: bot.timezone || "",
            client_description: bot.client_description || "",
            client_url: bot.client_url || "",
            client_email: bot.client_email || "",
            sentiment_analysis_prompt: bot.sentiment_analysis_prompt || "",
            client_email_name: bot.client_email_name || "",
            gpt_assistant_system_prompt: bot.gpt_assistant_system_prompt || "",
            button_background_colour: bot.button_background_colour || "#038a71",
            button_gif_url: bot.button_gif_url || "",
            favicon_png: bot.favicon_png || "",
            callback_completed_gif: bot.callback_completed_gif || "",
            product_name: bot.product_name || "",
          }

          setBotSettings(newSettings)
          console.log("Setting bot settings to:", newSettings)
        }
      } catch (error) {
        console.error("Error loading bot data:", error)
        setError(error instanceof Error ? error.message : "Failed to load bot data")
      } finally {
        setLoading(false)
      }
    }

    loadBotData()
  }, [selectedBot, isSelectionLoaded])

  const handleInputChange = (field: keyof BotSettings, value: string) => {
    console.log(`Changing ${field} to:`, value)
    setBotSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!selectedBot) return

    setSaving(true)
    setError(null)

    try {
      console.log("Saving bot settings:", botSettings)

      const { error: updateError } = await supabase.from("bots").update(botSettings).eq("bot_share_name", selectedBot)

      if (updateError) {
        throw new Error(`Failed to save settings: ${updateError.message}`)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setError(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSection = async (section: string, fields: (keyof BotSettings)[]) => {
    if (!selectedBot) return

    setSavingSection(section)
    setError(null)

    try {
      // Create an object with only the fields for this section
      const sectionData: Partial<BotSettings> = {}
      fields.forEach((field) => {
        sectionData[field] = botSettings[field]
      })

      console.log(`Saving ${section} settings:`, sectionData)

      const { error: updateError } = await supabase.from("bots").update(sectionData).eq("bot_share_name", selectedBot)

      if (updateError) {
        throw new Error(`Failed to save ${section} settings: ${updateError.message}`)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error)
      setError(error instanceof Error ? error.message : `Failed to save ${section} settings`)
    } finally {
      setSavingSection(null)
    }
  }

  const handleFileUpload = (type: "gif" | "favicon" | "callback") => {
    // Create file input element
    const input = document.createElement("input")
    input.type = "file"
    input.accept = type === "gif" || type === "callback" ? "image/gif" : "image/png,image/webp"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // For now, just show an alert - file upload logic will be added later
        alert(`File selected: ${file.name}. Upload functionality will be implemented soon.`)
      }
    }
    input.click()
  }

  const handleImageError = (type: "gif" | "favicon" | "callback") => {
    setImageErrors((prev) => ({ ...prev, [type]: true }))
  }

  const isValidUrl = (url: string) => {
    if (!url) return false
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Show bot selection required
  if (!selectedBot && !loading && isSelectionLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Bot Selection Required</CardTitle>
            <CardDescription>Please select a specific bot from the sidebar to configure its settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading || !isSelectionLoaded) {
    return <Loading message="Loading bot settings..." />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#212121]">{clientName}</h1>
          <Button onClick={handleSave} disabled={saving} className="bg-[#038a71] hover:bg-[#038a71]/90">
            {saving ? (
              <>
                <Loading size="sm" className="mr-2" />
                Saving All...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">Settings saved successfully!</p>
          </div>
        )}

        {debugInfo && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-mono text-sm">{debugInfo}</p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Basic Settings</CardTitle>
                <CardDescription>Configure basic client information</CardDescription>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection("Basic Settings", [
                    "timezone",
                    "product_name",
                    "client_url",
                    "client_email",
                    "client_email_name",
                  ])
                }
                disabled={savingSection === "Basic Settings"}
                variant="outline"
                size="sm"
              >
                {savingSection === "Basic Settings" ? (
                  <>
                    <Loading size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    key={`timezone-${selectedBot}`}
                    value={botSettings.timezone}
                    onValueChange={(value) => handleInputChange("timezone", value)}
                  >
                    <SelectTrigger id="timezone-trigger">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500 mt-1">
                    Current timezone value: "{botSettings.timezone || "not set"}"
                    {botSettings.timezone && !timezones.some((tz) => tz.value === botSettings.timezone) && (
                      <span className="text-red-500 ml-2">(not found in options)</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="product_name">Product Name</Label>
                  <Input
                    id="product_name"
                    value={botSettings.product_name}
                    onChange={(e) => handleInputChange("product_name", e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_url">Client URL</Label>
                  <Input
                    id="client_url"
                    type="url"
                    value={botSettings.client_url}
                    onChange={(e) => handleInputChange("client_url", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={botSettings.client_email}
                    onChange={(e) => handleInputChange("client_email", e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="client_email_name">Client Email Name</Label>
                <Input
                  id="client_email_name"
                  value={botSettings.client_email_name}
                  onChange={(e) => handleInputChange("client_email_name", e.target.value)}
                  placeholder="Enter email display name"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>Configure AI prompts and behavior</CardDescription>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection("AI Configuration", [
                    "client_description",
                    "gpt_assistant_system_prompt",
                    "sentiment_analysis_prompt",
                  ])
                }
                disabled={savingSection === "AI Configuration"}
                variant="outline"
                size="sm"
              >
                {savingSection === "AI Configuration" ? (
                  <>
                    <Loading size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client_description">Client Description</Label>
                <Textarea
                  id="client_description"
                  value={botSettings.client_description}
                  onChange={(e) => handleInputChange("client_description", e.target.value)}
                  placeholder="Describe the client and their business"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="gpt_assistant_system_prompt">GPT Assistant System Prompt</Label>
                <Textarea
                  id="gpt_assistant_system_prompt"
                  value={botSettings.gpt_assistant_system_prompt}
                  onChange={(e) => handleInputChange("gpt_assistant_system_prompt", e.target.value)}
                  placeholder="Enter the system prompt for the AI assistant"
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="sentiment_analysis_prompt">Sentiment Analysis Prompt</Label>
                <Textarea
                  id="sentiment_analysis_prompt"
                  value={botSettings.sentiment_analysis_prompt}
                  onChange={(e) => handleInputChange("sentiment_analysis_prompt", e.target.value)}
                  placeholder="Enter the prompt for sentiment analysis"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Customization */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Visual Customization</CardTitle>
                <CardDescription>Configure visual elements and branding</CardDescription>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection("Visual Customization", [
                    "button_background_colour",
                    "button_gif_url",
                    "favicon_png",
                    "callback_completed_gif",
                  ])
                }
                disabled={savingSection === "Visual Customization"}
                variant="outline"
                size="sm"
              >
                {savingSection === "Visual Customization" ? (
                  <>
                    <Loading size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="button_background_colour">Button Background Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="button_background_colour"
                    type="color"
                    value={botSettings.button_background_colour}
                    onChange={(e) => handleInputChange("button_background_colour", e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={botSettings.button_background_colour}
                    onChange={(e) => handleInputChange("button_background_colour", e.target.value)}
                    placeholder="#038a71"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Button GIF */}
                <div>
                  <Label htmlFor="button_gif_url">Button GIF URL</Label>
                  <div className="space-y-2">
                    <Input
                      id="button_gif_url"
                      value={botSettings.button_gif_url}
                      onChange={(e) => handleInputChange("button_gif_url", e.target.value)}
                      placeholder="https://example.com/button.gif"
                    />
                    <Button
                      onClick={() => handleFileUpload("gif")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload GIF (Coming Soon)
                    </Button>
                    {botSettings.button_gif_url && isValidUrl(botSettings.button_gif_url) && (
                      <div className="border rounded p-2 bg-gray-50">
                        {!imageErrors.gif ? (
                          <img
                            src={botSettings.button_gif_url || "/placeholder.svg"}
                            alt="Button GIF"
                            className="w-full h-20 object-contain"
                            onError={() => handleImageError("gif")}
                          />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center bg-gray-200 text-gray-500">
                            <ImageIcon className="h-6 w-6" />
                            <span className="ml-2 text-sm">Failed to load</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon */}
                <div>
                  <Label htmlFor="favicon_png">Favicon PNG URL</Label>
                  <div className="space-y-2">
                    <Input
                      id="favicon_png"
                      value={botSettings.favicon_png}
                      onChange={(e) => handleInputChange("favicon_png", e.target.value)}
                      placeholder="https://example.com/favicon.png"
                    />
                    <Button
                      onClick={() => handleFileUpload("favicon")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PNG (Coming Soon)
                    </Button>
                    {botSettings.favicon_png && isValidUrl(botSettings.favicon_png) && (
                      <div className="border rounded p-2 bg-gray-50">
                        {!imageErrors.favicon ? (
                          <img
                            src={botSettings.favicon_png || "/placeholder.svg"}
                            alt="Favicon"
                            className="w-full h-20 object-contain"
                            onError={() => handleImageError("favicon")}
                          />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center bg-gray-200 text-gray-500">
                            <ImageIcon className="h-6 w-6" />
                            <span className="ml-2 text-sm">Failed to load</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Callback Completed GIF */}
                <div>
                  <Label htmlFor="callback_completed_gif">Callback Completed GIF URL</Label>
                  <div className="space-y-2">
                    <Input
                      id="callback_completed_gif"
                      value={botSettings.callback_completed_gif}
                      onChange={(e) => handleInputChange("callback_completed_gif", e.target.value)}
                      placeholder="https://example.com/success.gif"
                    />
                    <Button
                      onClick={() => handleFileUpload("callback")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload GIF (Coming Soon)
                    </Button>
                    {botSettings.callback_completed_gif && isValidUrl(botSettings.callback_completed_gif) && (
                      <div className="border rounded p-2 bg-gray-50">
                        {!imageErrors.callback ? (
                          <img
                            src={botSettings.callback_completed_gif || "/placeholder.svg"}
                            alt="Callback Completed GIF"
                            className="w-full h-20 object-contain"
                            onError={() => handleImageError("callback")}
                          />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center bg-gray-200 text-gray-500">
                            <ImageIcon className="h-6 w-6" />
                            <span className="ml-2 text-sm">Failed to load</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
