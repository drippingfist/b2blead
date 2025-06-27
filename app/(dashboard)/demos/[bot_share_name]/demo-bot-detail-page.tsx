"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { timezones } from "@/lib/timezones"
import { updateBotBasicInfo } from "@/lib/actions"

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
  client_description: string
  timezone: string
}

interface DemoBotDetailPageProps {
  bot: Bot
}

export default function DemoBotDetailPage({ bot }: DemoBotDetailPageProps) {
  const [basicInfo, setBasicInfo] = useState({
    client_name: bot.client_name || "",
    client_description: bot.client_description || "",
    timezone: bot.timezone || "Asia/Bangkok",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof typeof basicInfo, value: string) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateBotBasicInfo(bot.bot_share_name, basicInfo)
      if (result.error) {
        throw new Error(result.error)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <Link href="/demos" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Demos List
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">{bot.client_name}</h1>
        <p className="text-[#616161] font-mono">{bot.bot_share_name}</p>
      </div>

      <Tabs defaultValue="basic-info">
        <TabsList>
          <TabsTrigger value="basic-info">1. Basic Info</TabsTrigger>
          <TabsTrigger value="scrape">2. Scrape</TabsTrigger>
          <TabsTrigger value="tab3">3. Tab 3</TabsTrigger>
          <TabsTrigger value="tab4">4. Tab 4</TabsTrigger>
          <TabsTrigger value="tab5">5. Tab 5</TabsTrigger>
        </TabsList>
        <TabsContent value="basic-info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure the fundamental details of the bot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                  Settings saved successfully!
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bot_share_name">Bot Share Name (Read-only)</Label>
                <Input id="bot_share_name" value={bot.bot_share_name} readOnly disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={basicInfo.client_name}
                  onChange={(e) => handleInputChange("client_name", e.target.value)}
                  placeholder="Enter client name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_description">Client Description</Label>
                <Textarea
                  id="client_description"
                  value={basicInfo.client_description}
                  onChange={(e) => handleInputChange("client_description", e.target.value)}
                  placeholder="Describe the client and their business"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={basicInfo.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
                  <SelectTrigger>
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
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scrape" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Scraping configuration will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tab3" className="mt-4">
          <p>Content for Tab 3.</p>
        </TabsContent>
        <TabsContent value="tab4" className="mt-4">
          <p>Content for Tab 4.</p>
        </TabsContent>
        <TabsContent value="tab5" className="mt-4">
          <p>Content for Tab 5.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
