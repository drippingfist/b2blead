"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getDashboardMetrics, getCurrentUserEmailClient, getUserBotAccess, getChatMetrics } from "@/lib/database"
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Phone,
  Clock,
  Smile,
  Meh,
  Frown,
  Calendar,
  Info,
  Users,
  BarChart3,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Loading from "@/components/loading"
import { supabase } from "@/lib/supabase/client"

type TimePeriod = "today" | "last7days" | "last30days" | "last90days" | "alltime" | "custom"

interface DashboardMetrics {
  totalChats: number
  totalCallbacks: number
  callbackPercentage: number
  droppedCallbacks: number
  averageSentiment: number
  averageResponseTime: number
  globalAverageResponseTime: number
  sentimentDistribution: { score: number; count: number }[]
  previousPeriodComparison: {
    totalChats: number
    totalCallbacks: number
    callbackPercentage: number
    droppedCallbacks: number
    averageSentiment: number
    averageResponseTime: number
    globalAverageResponseTime: number
  }
}

export default function Dashboard() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedTimePeriod")
      return (stored as TimePeriod) || "last30days"
    }
    return "last30days"
  })
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalChats: 0,
    totalCallbacks: 0,
    callbackPercentage: 0,
    droppedCallbacks: 0,
    averageSentiment: 0,
    averageResponseTime: 0,
    globalAverageResponseTime: 0,
    sentimentDistribution: [],
    previousPeriodComparison: {
      totalChats: 0,
      totalCallbacks: 0,
      callbackPercentage: 0,
      droppedCallbacks: 0,
      averageSentiment: 0,
      averageResponseTime: 0,
      globalAverageResponseTime: 0,
    },
  })
  const [chatMetrics, setChatMetrics] = useState<{
    totalThreads: number
    totalMessages: number
    messagesPerThread: number
    previousPeriodComparison: {
      totalThreads: number
      totalMessages: number
      messagesPerThread: number
    }
  }>({
    totalThreads: 0,
    totalMessages: 0,
    messagesPerThread: 0,
    previousPeriodComparison: {
      totalThreads: 0,
      totalMessages: 0,
      messagesPerThread: 0,
    },
  })
  const [bots, setBots] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentBotName, setCurrentBotName] = useState<string>("Selected Bot")
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [userAccess, setUserAccess] = useState<{
    role: "superadmin" | "admin" | "member" | null
    accessibleBots: string[]
    isSuperAdmin: boolean
  } | null>(null)
  const [botSelectionReady, setBotSelectionReady] = useState(false)
  const [accessibleBotCount, setAccessibleBotCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Initialize user access and bot selection
  useEffect(() => {
    const initializeUserAccess = async () => {
      try {
        console.log("🔍 Dashboard: Initializing user access...")

        // Get user access info
        const access = await getUserBotAccess()
        console.log("🔍 Dashboard: User access received:", access)
        console.log("🔍 Dashboard: Accessible bots from API:", access.accessibleBots)
        setUserAccess(access)

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          console.error("❌ Dashboard: No authenticated user found")
          return
        }

        // Count accessible bots directly from the database
        const { count, error } = await supabase
          .from("bot_users")
          .select("bot_share_name", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_active", true)

        if (error) {
          console.error("❌ Dashboard: Error counting accessible bots:", error)
        } else {
          console.log("🔍 Dashboard: User has access to", count, "bots")
          setAccessibleBotCount(count || 0)
        }

        // Get stored bots or wait for them to be loaded
        const storedBots = JSON.parse(localStorage.getItem("userBots") || "[]")
        console.log("🔍 Dashboard: Stored bots from localStorage:", storedBots)
        setBots(storedBots)

        // Get stored bot selection
        const storedBot = localStorage.getItem("selectedBot")
        console.log("🔍 Dashboard: Stored bot selection:", storedBot)

        // Determine proper bot selection based on user access
        if (access.isSuperAdmin) {
          // Superadmin: can select "All Bots" (null) or specific bot
          if (storedBot && storedBot !== "null") {
            setSelectedBot(storedBot)
            console.log("🔍 Dashboard: Superadmin using stored bot:", storedBot)
          } else {
            // Default to "All Bots" for superadmin if no specific selection
            setSelectedBot(null)
            console.log("🔍 Dashboard: Superadmin defaulting to All Bots")
          }
        } else {
          // Regular user: can also use "All Bots" (null) or specific bot
          if (storedBot && storedBot !== "null" && access.accessibleBots.includes(storedBot)) {
            setSelectedBot(storedBot)
            console.log("🔍 Dashboard: Regular user using stored bot:", storedBot)
          } else {
            // Default to "All Bots" for regular users too
            setSelectedBot(null)
            console.log("🔍 Dashboard: Regular user defaulting to All Bots")
          }
        }

        setBotSelectionReady(true)
        console.log("🔍 Dashboard: Bot selection ready with access:", access)
      } catch (error) {
        console.error("❌ Dashboard: Error initializing user access:", error)
        setBotSelectionReady(true) // Still allow page to load
      }
    }

    initializeUserAccess()
  }, [])

  // Listen for bot selection changes from the bot selector
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      console.log("🔍 Dashboard: Bot selection changed to:", event.detail)
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  // Listen for bots being loaded by other components
  useEffect(() => {
    const handleBotsLoaded = (event: CustomEvent) => {
      console.log("🔍 Dashboard: Bots loaded:", event.detail)
      setBots(event.detail)
    }

    window.addEventListener("botsLoaded", handleBotsLoaded as EventListener)
    return () => window.removeEventListener("botsLoaded", handleBotsLoaded as EventListener)
  }, [])

  // Load dashboard data only when bot selection is ready
  useEffect(() => {
    const fetchData = async () => {
      if (!botSelectionReady) {
        console.log("🔍 Dashboard: Waiting for bot selection to be ready...")
        return
      }

      // Wait for userAccess to be properly loaded
      if (!userAccess) {
        console.log("🔍 Dashboard: Waiting for user access to be loaded...")
        return
      }

      console.log("🔍 Dashboard: Loading data for bot:", selectedBot, "period:", selectedPeriod)
      console.log("🔍 Dashboard: User access:", userAccess)
      console.log("🔍 Dashboard: Accessible bots:", userAccess.accessibleBots)
      setLoading(true)

      try {
        // Get the list of accessible bots for the user
        const accessibleBots = userAccess.accessibleBots || []

        // If we don't have accessible bots and we're not a superadmin, something is wrong
        if (accessibleBots.length === 0 && !userAccess.isSuperAdmin) {
          console.error("❌ Dashboard: No accessible bots found for non-superadmin user")
          setLoading(false)
          return
        }

        console.log("🔍 Dashboard: Using accessible bots:", accessibleBots)

        // For "All Bots" view, pass the accessible bots list
        const [fetchedMetrics, fetchedChatMetrics, fetchedUserEmail] = await Promise.all([
          selectedBot === null
            ? getDashboardMetrics(null, selectedPeriod, accessibleBots)
            : getDashboardMetrics(selectedBot, selectedPeriod, accessibleBots),
          selectedBot === null
            ? getChatMetrics(null, selectedPeriod, accessibleBots)
            : getChatMetrics(selectedBot, selectedPeriod, accessibleBots),
          getCurrentUserEmailClient(),
        ])

        console.log("🔍 Dashboard: Fetched metrics:", fetchedMetrics)
        console.log("🔍 Dashboard: Fetched chat metrics:", fetchedChatMetrics)

        setMetrics(fetchedMetrics)
        setChatMetrics(fetchedChatMetrics)
        setUserEmail(fetchedUserEmail)

        // Set current bot name for display
        if (selectedBot === null) {
          setCurrentBotName("All Bots")
        } else if (selectedBot) {
          const currentBot = bots.find((b) => b.bot_share_name === selectedBot)
          setCurrentBotName(currentBot?.client_name || currentBot?.bot_share_name || "Selected Bot")
        } else {
          setCurrentBotName("No Bot Selected")
        }

        console.log("✅ Dashboard: Data loaded successfully")
      } catch (error) {
        console.error("❌ Dashboard: Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, selectedPeriod, botSelectionReady, userAccess, bots])

  // Persist time period selection to localStorage
  useEffect(() => {
    localStorage.setItem("selectedTimePeriod", selectedPeriod)
  }, [selectedPeriod])

  const formatPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%"
    const change = ((current - previous) / previous) * 100
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }

  const getChangeColor = (current: number, previous: number, isResponseTime = false) => {
    if (isResponseTime) {
      // For response time, lower is better
      if (current < previous) return "text-green-600"
      if (current > previous) return "text-red-600"
    } else {
      // For other metrics, higher is better
      if (current > previous) return "text-green-600"
      if (current < previous) return "text-red-600"
    }
    return "text-gray-500"
  }

  const getChangeIcon = (current: number, previous: number, isResponseTime = false) => {
    if (isResponseTime) {
      // For response time, lower is better
      if (current < previous) return <TrendingDown className="h-3 w-3" />
      if (current > previous) return <TrendingUp className="h-3 w-3" />
    } else {
      // For other metrics, higher is better
      if (current > previous) return <TrendingUp className="h-3 w-3" />
      if (current < previous) return <TrendingDown className="h-3 w-3" />
    }
    return null
  }

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case "today":
        return "Today"
      case "last7days":
        return "Last 7 days"
      case "last30days":
        return "Last 30 days"
      case "last90days":
        return "Last 90 days"
      case "alltime":
        return "All time"
      case "custom":
        return "Custom"
      default:
        return "Last 30 days"
    }
  }

  const getSentimentEmoji = (score: number) => {
    if (score >= 4) return <Smile className="h-5 w-5 text-green-600" />
    if (score === 3) return <Meh className="h-5 w-5 text-yellow-600" />
    return <Frown className="h-5 w-5 text-red-600" />
  }

  const maxSentimentCount = Math.max(...metrics.sentimentDistribution.map((s) => s.count), 1)

  const handleTooltipHover = (tooltipId: string, event: React.MouseEvent) => {
    setHoveredTooltip(tooltipId)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const handleTooltipLeave = () => {
    setHoveredTooltip(null)
  }

  const getTooltipText = (tooltipId: string) => {
    switch (tooltipId) {
      case "total-threads":
        return "Total number of conversation threads started by users during the selected time period"
      case "total-messages":
        return "Total number of messages (both user and AI messages) exchanged during the selected time period"
      case "messages-per-thread":
        return "Average number of messages per conversation thread"
      case "total-callbacks":
        return "Total number of completed callback requests where users provided their contact information"
      case "callback-rate":
        return "Percentage of conversation threads that resulted in a callback request - your conversion rate"
      case "dropped-callbacks":
        return "Number of times users requested a callback but didn't complete the callback form"
      case "client-ai":
        return "This is average time it takes the AI to finish responding to the user"
      case "all-ai":
        return "This is AI's average response time across all of our clients. Get in touch to discuss how we can speed up your AI"
      default:
        return ""
    }
  }

  if (loading || !botSelectionReady) {
    return <Loading message={!botSelectionReady ? "Initializing..." : "Loading dashboard..."} />
  }

  return (
    <div className="p-4 md:p-8 relative">
      {/* Tooltip */}
      {hoveredTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
        >
          {getTooltipText(hoveredTooltip)}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Dashboard</h1>
        <p className="text-[#616161]">
          Welcome back, {userEmail}. You have access to {accessibleBotCount} bot(s).
        </p>
        <p className="text-sm text-[#038a71] mt-1">Currently viewing: {currentBotName}</p>
      </div>

      {/* Time Period Selector */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
        <div></div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-[#616161]" />
            <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="last90days">Last 90 days</SelectItem>
                <SelectItem value="alltime">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Row 1 - Chat Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Total Threads */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-[#038a71]" />
                Total Threads
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("total-threads", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "total-threads") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{chatMetrics.totalThreads}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(chatMetrics.totalThreads, chatMetrics.previousPeriodComparison.totalThreads)}`}
            >
              {getChangeIcon(chatMetrics.totalThreads, chatMetrics.previousPeriodComparison.totalThreads)}
              <span className="ml-1">
                {formatPercentageChange(chatMetrics.totalThreads, chatMetrics.previousPeriodComparison.totalThreads)}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        {/* Total Messages */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#038a71]" />
                Total Messages
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("total-messages", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "total-messages") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{chatMetrics.totalMessages}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(chatMetrics.totalMessages, chatMetrics.previousPeriodComparison.totalMessages)}`}
            >
              {getChangeIcon(chatMetrics.totalMessages, chatMetrics.previousPeriodComparison.totalMessages)}
              <span className="ml-1">
                {formatPercentageChange(chatMetrics.totalMessages, chatMetrics.previousPeriodComparison.totalMessages)}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        {/* Messages per Thread */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#038a71]" />
                Messages/Thread
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("messages-per-thread", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "messages-per-thread") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">
                {chatMetrics.messagesPerThread.toFixed(1)}
              </p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(chatMetrics.messagesPerThread, chatMetrics.previousPeriodComparison.messagesPerThread)}`}
            >
              {getChangeIcon(chatMetrics.messagesPerThread, chatMetrics.previousPeriodComparison.messagesPerThread)}
              <span className="ml-1">
                {formatPercentageChange(
                  chatMetrics.messagesPerThread,
                  chatMetrics.previousPeriodComparison.messagesPerThread,
                )}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">Average engagement</p>
        </div>
      </div>

      {/* Row 2 - Callback Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        {/* Total Callbacks */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <Phone className="h-5 w-5 mr-2 text-[#038a71]" />
                Total Callbacks
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("total-callbacks", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "total-callbacks") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{metrics.totalCallbacks}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.totalCallbacks, metrics.previousPeriodComparison.totalCallbacks)}`}
            >
              {getChangeIcon(metrics.totalCallbacks, metrics.previousPeriodComparison.totalCallbacks)}
              <span className="ml-1">
                {formatPercentageChange(metrics.totalCallbacks, metrics.previousPeriodComparison.totalCallbacks)}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        {/* Callback Rate */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                Callback Rate
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("callback-rate", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "callback-rate") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">
                {metrics.callbackPercentage.toFixed(1)}%
              </p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.callbackPercentage, metrics.previousPeriodComparison.callbackPercentage)}`}
            >
              {getChangeIcon(metrics.callbackPercentage, metrics.previousPeriodComparison.callbackPercentage)}
              <span className="ml-1">
                {formatPercentageChange(
                  metrics.callbackPercentage,
                  metrics.previousPeriodComparison.callbackPercentage,
                )}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">Conversion rate</p>
        </div>

        {/* Dropped Callbacks */}
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                Dropped Callbacks
                <Info
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  onMouseEnter={(e) => handleTooltipHover("dropped-callbacks", e)}
                  onMouseLeave={handleTooltipLeave}
                  onMouseMove={(e) => {
                    if (hoveredTooltip === "dropped-callbacks") {
                      setTooltipPosition({ x: e.clientX, y: e.clientY })
                    }
                  }}
                />
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-red-600">{metrics.droppedCallbacks}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.droppedCallbacks, metrics.previousPeriodComparison.droppedCallbacks, true)}`}
            >
              {getChangeIcon(metrics.droppedCallbacks, metrics.previousPeriodComparison.droppedCallbacks, true)}
              <span className="ml-1">
                {formatPercentageChange(metrics.droppedCallbacks, metrics.previousPeriodComparison.droppedCallbacks)}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">Incomplete requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Panel #1 - Sentiment Analysis */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#212121]">Sentiment Analysis</h3>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.averageSentiment, metrics.previousPeriodComparison.averageSentiment)}`}
            >
              {getChangeIcon(metrics.averageSentiment, metrics.previousPeriodComparison.averageSentiment)}
              <span className="ml-1">
                {formatPercentageChange(metrics.averageSentiment, metrics.previousPeriodComparison.averageSentiment)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-[#616161] mb-2">Average Sentiment Score</p>
            <p className="text-3xl font-bold text-[#038a71]">{metrics.averageSentiment.toFixed(1)}/5</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-[#616161] mb-3">Sentiment Distribution</p>
            {[5, 4, 3, 2, 1].map((score) => {
              const data = metrics.sentimentDistribution.find((s) => s.score === score)
              const count = data?.count || 0
              const percentage =
                metrics.sentimentDistribution.length > 0
                  ? (count / metrics.sentimentDistribution.reduce((sum, s) => sum + s.count, 0)) * 100
                  : 0

              return (
                <div key={score} className="flex items-center space-x-3">
                  <div className="flex items-center w-8">
                    {getSentimentEmoji(score)}
                    <span className="text-sm ml-1">{score}</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#038a71] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / maxSentimentCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-[#616161] w-12 text-right">{count}</div>
                  <div className="text-xs text-[#616161] w-12 text-right">{percentage.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel #2 - Response Speed */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#212121] flex items-center">
              <Clock className="h-5 w-5 mr-2 text-[#038a71]" />
              AI Response Speed
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Client AI response time */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-[#212121] flex items-center">
                  {currentBotName} AI
                  <Info
                    className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                    onMouseEnter={(e) => handleTooltipHover("client-ai", e)}
                    onMouseLeave={handleTooltipLeave}
                    onMouseMove={(e) => {
                      if (hoveredTooltip === "client-ai") {
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }
                    }}
                  />
                </h4>
                <div
                  className={`flex items-center text-xs ${getChangeColor(metrics.averageResponseTime, metrics.previousPeriodComparison.averageResponseTime, true)}`}
                >
                  {getChangeIcon(
                    metrics.averageResponseTime,
                    metrics.previousPeriodComparison.averageResponseTime,
                    true,
                  )}
                  <span className="ml-1">
                    {formatPercentageChange(
                      metrics.averageResponseTime,
                      metrics.previousPeriodComparison.averageResponseTime,
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#616161] mb-1">Response Speed</p>
              <p className="text-2xl font-bold text-[#038a71]">{(metrics.averageResponseTime / 1000).toFixed(1)}s</p>
              <div className="mt-3 text-xs text-[#616161]">
                <div className="flex justify-between items-center">
                  <span>Previous period:</span>
                  <span className="font-medium">
                    {(metrics.previousPeriodComparison.averageResponseTime / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>

            {/* All AI response time */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-[#212121] flex items-center">
                  All AI
                  <Info
                    className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                    onMouseEnter={(e) => handleTooltipHover("all-ai", e)}
                    onMouseLeave={handleTooltipLeave}
                    onMouseMove={(e) => {
                      if (hoveredTooltip === "all-ai") {
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }
                    }}
                  />
                </h4>
                <div
                  className={`flex items-center text-xs ${getChangeColor(metrics.globalAverageResponseTime, metrics.previousPeriodComparison.globalAverageResponseTime, true)}`}
                >
                  {getChangeIcon(
                    metrics.globalAverageResponseTime,
                    metrics.previousPeriodComparison.globalAverageResponseTime,
                    true,
                  )}
                  <span className="ml-1">
                    {formatPercentageChange(
                      metrics.globalAverageResponseTime,
                      metrics.previousPeriodComparison.globalAverageResponseTime,
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#616161] mb-1">Response Speed</p>
              <p className="text-2xl font-bold text-[#038a71]">
                {(metrics.globalAverageResponseTime / 1000).toFixed(1)}s
              </p>
              <div className="mt-3 text-xs text-[#616161]">
                <div className="flex justify-between items-center">
                  <span>Previous period:</span>
                  <span className="font-medium">
                    {(metrics.previousPeriodComparison.globalAverageResponseTime / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
