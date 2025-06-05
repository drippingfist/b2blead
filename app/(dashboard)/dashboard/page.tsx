"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getDashboardMetrics, getCurrentUserEmailClient } from "@/lib/database"
import { TrendingUp, TrendingDown, MessageSquare, Phone, Clock, Smile, Meh, Frown, Calendar, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TimePeriod = "today" | "last7days" | "last30days" | "alltime" | "custom"

interface DashboardMetrics {
  totalChats: number
  totalCallbacks: number
  callbackPercentage: number
  droppedCallbacks: number
  averageSentiment: number
  averageResponseTime: number
  vrgUserResponseTime: number
  globalAverageResponseTime: number
  globalVrgUserResponseTime: number
  sentimentDistribution: { score: number; count: number }[]
  previousPeriodComparison: {
    totalChats: number
    totalCallbacks: number
    callbackPercentage: number
    droppedCallbacks: number
    averageSentiment: number
    averageResponseTime: number
    vrgUserResponseTime: number
    globalAverageResponseTime: number
    globalVrgUserResponseTime: number
  }
}

export default function Dashboard() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("last30days")
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalChats: 0,
    totalCallbacks: 0,
    callbackPercentage: 0,
    droppedCallbacks: 0,
    averageSentiment: 0,
    averageResponseTime: 0,
    vrgUserResponseTime: 0,
    globalAverageResponseTime: 0,
    globalVrgUserResponseTime: 0,
    sentimentDistribution: [],
    previousPeriodComparison: {
      totalChats: 0,
      totalCallbacks: 0,
      callbackPercentage: 0,
      droppedCallbacks: 0,
      averageSentiment: 0,
      averageResponseTime: 0,
      vrgUserResponseTime: 0,
      globalAverageResponseTime: 0,
      globalVrgUserResponseTime: 0,
    },
  })
  const [bots, setBots] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentBotName, setCurrentBotName] = useState<string>("Selected Bot")
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Load selected bot from localStorage
  useEffect(() => {
    const storedBot = localStorage.getItem("selectedBot")
    if (storedBot && storedBot !== "null") {
      setSelectedBot(storedBot)
    }
  }, [])

  // Listen for bot selection changes
  useEffect(() => {
    const handleBotSelectionChanged = (event: CustomEvent) => {
      setSelectedBot(event.detail)
    }

    window.addEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
    return () => window.removeEventListener("botSelectionChanged", handleBotSelectionChanged as EventListener)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [fetchedMetrics, fetchedUserEmail] = await Promise.all([
          getDashboardMetrics(selectedBot, selectedPeriod),
          getCurrentUserEmailClient(),
        ])

        setMetrics(fetchedMetrics)
        setUserEmail(fetchedUserEmail)

        // Get bots from the global bot selector instead of fetching again
        const storedBots = JSON.parse(localStorage.getItem("userBots") || "[]")
        setBots(storedBots)

        // Set current bot name
        if (selectedBot) {
          const currentBot = storedBots.find((b) => b.bot_share_name === selectedBot)
          setCurrentBotName(currentBot?.client_name || currentBot?.bot_share_name || "Selected Bot")
        } else {
          setCurrentBotName("All Bots")
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, selectedPeriod])

  // Listen for bots being loaded by other components
  useEffect(() => {
    const handleBotsLoaded = (event: CustomEvent) => {
      setBots(event.detail)
    }

    window.addEventListener("botsLoaded", handleBotsLoaded as EventListener)
    return () => window.removeEventListener("botsLoaded", handleBotsLoaded as EventListener)
  }, [])

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
      case "dropped-callbacks":
        return "Number of times a user requested a callback but didn't complete the callback flow"
      case "client-ai":
        return "This is average time it takes the AI to finish responding to the user"
      case "client-users":
        return "This is average time it takes your users to respond in the chat"
      case "all-ai":
        return "This is average response time across all of our clients. Get in touch to discuss how we can increase your AI's response speed."
      case "all-users":
        return "This is average time for ALL users across all our deployments to respond in the chat"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
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
          Welcome back, {userEmail}. You have access to {bots.length} bot(s).
        </p>
        {selectedBot && (
          <p className="text-sm text-[#038a71] mt-1">
            Currently viewing: {bots.find((b) => b.bot_share_name === selectedBot)?.client_name || selectedBot}
          </p>
        )}
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
                <SelectItem value="alltime">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Panel #1 - Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-[#038a71]" />
                Total Chats
              </h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{metrics.totalChats}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.totalChats, metrics.previousPeriodComparison.totalChats)}`}
            >
              {getChangeIcon(metrics.totalChats, metrics.previousPeriodComparison.totalChats)}
              <span className="ml-1">
                {formatPercentageChange(metrics.totalChats, metrics.previousPeriodComparison.totalChats)}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121] flex items-center">
                <Phone className="h-5 w-5 mr-2 text-[#038a71]" />
                Total Callbacks
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

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[#212121]">Callback Rate</h2>
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
          <p className="text-sm text-[#616161] mt-1">Threads requesting callbacks</p>
        </div>

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
          <p className="text-sm text-[#616161] mt-1">Requests without callbacks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Panel #2 - Sentiment Analysis */}
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

        {/* Panel #3 - Response Speed */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#212121] flex items-center">
              <Clock className="h-5 w-5 mr-2 text-[#038a71]" />
              Response Speed
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Top Left - Bot AI response time */}
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

            {/* Top Right - All AI response time */}
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

            {/* Bottom Left - Bot Users response time */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-[#212121] flex items-center">
                  {currentBotName} Users
                  <Info
                    className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                    onMouseEnter={(e) => handleTooltipHover("client-users", e)}
                    onMouseLeave={handleTooltipLeave}
                    onMouseMove={(e) => {
                      if (hoveredTooltip === "client-users") {
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }
                    }}
                  />
                </h4>
                <div
                  className={`flex items-center text-xs ${getChangeColor(metrics.vrgUserResponseTime, metrics.previousPeriodComparison.vrgUserResponseTime, true)}`}
                >
                  {getChangeIcon(
                    metrics.vrgUserResponseTime,
                    metrics.previousPeriodComparison.vrgUserResponseTime,
                    true,
                  )}
                  <span className="ml-1">
                    {formatPercentageChange(
                      metrics.vrgUserResponseTime,
                      metrics.previousPeriodComparison.vrgUserResponseTime,
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#616161] mb-1">Response Speed</p>
              <p className="text-2xl font-bold text-[#038a71]">{(metrics.vrgUserResponseTime / 1000).toFixed(1)}s</p>
              <div className="mt-3 text-xs text-[#616161]">
                <div className="flex justify-between items-center">
                  <span>Previous period:</span>
                  <span className="font-medium">
                    {(metrics.previousPeriodComparison.vrgUserResponseTime / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Right - All Users response time */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-[#212121] flex items-center">
                  All Users
                  <Info
                    className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                    onMouseEnter={(e) => handleTooltipHover("all-users", e)}
                    onMouseLeave={handleTooltipLeave}
                    onMouseMove={(e) => {
                      if (hoveredTooltip === "all-users") {
                        setTooltipPosition({ x: e.clientX, y: e.clientY })
                      }
                    }}
                  />
                </h4>
                <div
                  className={`flex items-center text-xs ${getChangeColor(metrics.globalVrgUserResponseTime, metrics.previousPeriodComparison.globalVrgUserResponseTime, true)}`}
                >
                  {getChangeIcon(
                    metrics.globalVrgUserResponseTime,
                    metrics.previousPeriodComparison.globalVrgUserResponseTime,
                    true,
                  )}
                  <span className="ml-1">
                    {formatPercentageChange(
                      metrics.globalVrgUserResponseTime,
                      metrics.previousPeriodComparison.globalVrgUserResponseTime,
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#616161] mb-1">Response Speed</p>
              <p className="text-2xl font-bold text-[#038a71]">
                {(metrics.globalVrgUserResponseTime / 1000).toFixed(1)}s
              </p>
              <div className="mt-3 text-xs text-[#616161]">
                <div className="flex justify-between items-center">
                  <span>Previous period:</span>
                  <span className="font-medium">
                    {(metrics.previousPeriodComparison.globalVrgUserResponseTime / 1000).toFixed(1)}s
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
