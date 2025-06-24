"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, X, Trash2, Settings, PlusCircle, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { timezones } from "@/lib/timezones"
import { getInvitableBots } from "@/lib/user-actions"
import Loading from "@/components/loading"
import { useBotSelection } from "@/hooks/use-bot-selection"

export default function SettingsPage() {
  const router = useRouter()
  const { selectedBot, isSelectionLoaded } = useBotSelection()
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // --- State for Bot Settings ---
  const [botSettings, setBotSettings] = useState({
    client_email: "",
    transcript_email: "monthly",
    callback_email: "monthly",
    timezone: "Asia/Bangkok",
    groq_suggested_questions: ["", "", ""],
  })

  // State to hold the original data for cancellation
  const [initialBotSettings, setInitialBotSettings] = useState(botSettings)

  const [clientName, setClientName] = useState<string>("")

  // Load data when bot selection is ready
  useEffect(() => {
    if (isSelectionLoaded && selectedBot) {
      loadBotData(selectedBot)
    } else if (isSelectionLoaded) {
      setLoading(false)
    }
  }, [selectedBot, isSelectionLoaded])

  const loadBotData = async (botShareName: string) => {
    try {
      setLoading(true)
      setError(null)
      const { data: bot, error: botError } = await supabase
        .from("bots")
        .select("timezone, client_name, client_email, transcript_email, callback_email, groq_suggested_questions")
        .eq("bot_share_name", botShareName)
        .single()

      if (botError) throw botError
      if (!bot) throw new Error("Bot not found.")

      const rawQuestions = bot.groq_suggested_questions || ""
      const questions = rawQuestions.split("\n").map(q => q.replace(/^\d+\.\s*/, "").trim()).filter(q => q)
      while (questions.length < 3) questions.push("")

      const loadedSettings = {
        client_email: bot.client_email || "",
        transcript_email: bot.transcript_email || "monthly",
        callback_email: bot.callback_email || "monthly",
        timezone: bot.timezone || "Asia/Bangkok",
        groq_suggested_questions: questions,
      }

      setBotSettings(loadedSettings)
      setInitialBotSettings(loadedSettings)
      setClientName(bot.client_name || "")

    } catch (err: any) {
      setError(err.message || "Failed to load bot data")
    } finally {
      setLoading(false)
    }
  }

  const handleSavePanel = async (panelName: string, payload: any) => {
    if (!selectedBot) return
    setSavingSection(panelName)
    setError(null)
    setSuccess(null)
    try {
      const { error } = await supabase.from("bots").update(payload).eq("bot_share_name", selectedBot)
      if (error) throw error
      setSuccess(`${panelName} settings saved successfully!`)
      // Update the initial state to the newly saved state
      setInitialBotSettings(botSettings)
    } catch (err: any) {
      setError(`Failed to save ${panelName.toLowerCase()} settings: ${err.message}`)
    } finally {
      setSavingSection(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSaveEmailSettings = () => {
    handleSavePanel('Email', {
      client_email: botSettings.client_email,
      transcript_email: botSettings.transcript_email,
      callback_email: botSettings.callback_email,
    })
  }

  const handleSaveTimezone = () => {
    handleSavePanel('Timezone', { timezone: botSettings.timezone })
  }

  const handleSaveQuestions = () => {
    const suggestedQuestionsBlob = botSettings.groq_suggested_questions.filter(q => q.trim() !== "").join("\n")
    handleSavePanel('Questions', { groq_suggested_questions: suggestedQuestionsBlob })
  }

  const handleCancelEmailSettings = () => {
    setBotSettings(prev => ({
      ...prev,
      client_email: initialBotSettings.client_email,
      transcript_email: initialBotSettings.transcript_email,
      callback_email: initialBotSettings.callback_email,
    }))
  }

  const handleCancelTimezone = () => {
    setBotSettings(prev => ({ ...prev, timezone: initialBotSettings.timezone }))
  }

  const handleCancelQuestions = () => {
    setBotSettings(prev => ({ ...prev, groq_suggested_questions: [...initialBotSettings.groq_suggested_questions] }))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...botSettings.groq_suggested_questions]
    newQuestions[index] = value
    setBotSettings(prev => ({ ...prev, groq_suggested_questions: newQuestions }))
  }

  const addQuestionField = () => {
    setBotSettings(prev => ({ ...prev, groq_suggested_questions: [...prev.groq_suggested_questions, ""] }))
  }

  const removeQuestionField = (index: number) => {
    if (botSettings.groq_suggested_questions.length > 3) {
      const newQuestions = botSettings.groq_suggested_questions.filter((_, i) => i !== index)
      setBotSettings(prev => ({ ...prev, groq_suggested_questions: newQuestions }))
    }
  }

  if (!selectedBot && isSelectionLoaded) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full">
        <div className="bg-white p-8 rounded-lg border border-[#e0e0e0] shadow-sm max-w-md w-full text-center">
          <Settings className="h-12 w-12 text-[#038a71] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-[#212121] mb-2">Select a Bot</h1>
          <p className="text-[#616161] mb-6">Please select a bot from the dropdown menu in the sidebar.</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full">Return to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (loading) return <Loading message="Loading settings..." />

  return (
    <div className="p-4 md:p-8">
      {clientName && <div className="mb-2"><p className="text-sm text-[#616161] font-medium">{clientName}</p></div>}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Settings</h1>
          <p className="text-[#616161]">Manage your client-specific settings and preferences.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">{success}</div>}

      <div className="w-[60%] space-y-6">
        {/* Email Settings Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Email Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input id="clientEmail" type="email" value={botSettings.client_email} onChange={(e) => setBotSettings(prev => ({ ...prev, client_email: e.target.value }))} placeholder="Enter client email address" className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]" />
            </div>
            <div className="space-y-3">
              <h3 className="text-md font-medium text-[#212121]">Chat Transcripts</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2"><input type="radio" id="chat-never" name="chat-transcripts" value="never" checked={botSettings.transcript_email === "never"} onChange={(e) => setBotSettings(p => ({...p, transcript_email: e.target.value}))} /><label htmlFor="chat-never" className="text-sm text-[#212121]">Never</label></div>
                <div className="flex items-center space-x-2"><input type="radio" id="chat-daily" name="chat-transcripts" value="daily" checked={botSettings.transcript_email === "daily"} onChange={(e) => setBotSettings(p => ({...p, transcript_email: e.target.value}))} /><label htmlFor="chat-daily" className="text-sm text-[#212121]">Daily</label></div>
                <div className="flex items-center space-x-2"><input type="radio" id="chat-weekly" name="chat-transcripts" value="weekly" checked={botSettings.transcript_email === "weekly"} onChange={(e) => setBotSettings(p => ({...p, transcript_email: e.target.value}))} /><label htmlFor="chat-weekly" className="text-sm text-[#212121]">Weekly</label></div>
                <div className="flex items-center space-x-2"><input type="radio" id="chat-monthly" name="chat-transcripts" value="monthly" checked={botSettings.transcript_email === "monthly"} onChange={(e) => setBotSettings(p => ({...p, transcript_email: e.target.value}))} /><label htmlFor="chat-monthly" className="text-sm text-[#212121]">Monthly</label></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-md font-medium text-[#212121]">Callbacks Report</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2"><input type="radio" id="callbacks-never" name="callbacks-report" value="never" checked={botSettings.callback_email === "never"} onChange={(e) => setBotSettings(p => ({...p, callback_email: e.target.value}))} /><label htmlFor="callbacks-never" className="text-sm text-[#212121]">Never</label></div>
                <div className="flex items-center space-x-2"><input type="radio" id="callbacks-weekly" name="callbacks-report" value="weekly" checked={botSettings.callback_email === "weekly"} onChange={(e) => setBotSettings(p => ({...p, callback_email: e.target.value}))} /><label htmlFor="callbacks-weekly" className="text-sm text-[#212121]">Weekly</label></div>
                <div className="flex items-center space-x-2"><input type="radio" id="callbacks-monthly" name="callbacks-report" value="monthly" checked={botSettings.callback_email === "monthly"} onChange={(e) => setBotSettings(p => ({...p, callback_email: e.target.value}))} /><label htmlFor="callbacks-monthly" className="text-sm text-[#212121]">Monthly</label></div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelEmailSettings} disabled={savingSection !== null}>Cancel</Button>
            <Button onClick={handleSaveEmailSettings} disabled={savingSection !== null} className="bg-[#038a71] hover:bg-[#038a71]/90">
              {savingSection === 'Email' ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* Timezone Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Timezone Settings</h2>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={botSettings.timezone} onValueChange={(value) => setBotSettings(prev => ({ ...prev, timezone: value }))} disabled={loading || savingSection !== null}>
              <SelectTrigger className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"><SelectValue placeholder="Select your timezone" /></SelectTrigger>
              <SelectContent>{timezones.map((timezone) => (<SelectItem key={timezone.value} value={timezone.value}>{timezone.label}</SelectItem>))}</SelectContent>
            </Select>
            <p className="text-xs text-[#616161]">{selectedBot ? `This will update the timezone for ${clientName || selectedBot}.` : "This will update the timezone for the selected AI."}</p>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelTimezone} disabled={savingSection !== null}>Cancel</Button>
            <Button onClick={handleSaveTimezone} disabled={savingSection !== null} className="bg-[#038a71] hover:bg-[#038a71]/90">
              {savingSection === 'Timezone' ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
        
        {/* Permitted Suggested Questions Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Permitted Suggested Questions</h2>
          <p className="text-sm text-[#616161] mb-4">These questions will be suggested to the user during the chat. If no questions are added here, the AI will suggest any question it thinks is suitable.</p>
          <div className="space-y-4">
            {botSettings.groq_suggested_questions.map((question, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`question-${index}`}>Question {index + 1}</Label>
                  <Input id={`question-${index}`} value={question} onChange={(e) => handleQuestionChange(index, e.target.value)} placeholder={`Enter suggested question ${index + 1}`} className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]" />
                </div>
                {botSettings.groq_suggested_questions.length > 3 && (
                  <Button onClick={() => removeQuestionField(index)} variant="ghost" size="icon" className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
            <Button onClick={addQuestionField} variant="outline" className="w-full"><PlusCircle className="h-4 w-4 mr-2" />Add Question</Button>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancelQuestions} disabled={savingSection !== null}>Cancel</Button>
            <Button onClick={handleSaveQuestions} disabled={savingSection !== null} className="bg-[#038a71] hover:bg-[#038a71]/90">
              {savingSection === 'Questions' ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
