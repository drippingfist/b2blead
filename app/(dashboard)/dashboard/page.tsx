"use client"

import { useEffect, useState } from "react"
import { getBotsClient, getCurrentUserEmailClient, getDashboardMetrics } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, MessageSquare, Phone, Clock, Smile, Meh, Frown } from "lucide-react"

type TimePeriod = "today" | "last7days" | "last30days" | "alltime" | "custom"

interface DashboardMetrics {
  totalChats: number
  totalCallbacks: number
  callbackPercentage: number
  droppedCallbacks: number
  averageSentiment: number
  averageResponseTime: number
  sentimentDistribution: { score: number; count: number }[]
  previousPeriodComparison: {
    totalChats: number
    totalCallbacks: number
    callbackPercentage: number
    droppedCallbacks: number
    averageSentiment: number
    averageResponseTime: number
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
    sentimentDistribution: [],
    previousPeriodComparison: {
      totalChats: 0,
      totalCallbacks: 0,
      callbackPercentage: 0,
      droppedCallbacks: 0,
      averageSentiment: 0,
      averageResponseTime: 0,
    },
  })
  const [bots, setBots] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        const [fetchedMetrics, fetchedBots, fetchedUserEmail] = await Promise.all([
          getDashboardMetrics(selectedBot, selectedPeriod),
          getBotsClient(),
          getCurrentUserEmailClient(),
        ])

        setMetrics(fetchedMetrics)
        setBots(fetchedBots)
        setUserEmail(fetchedUserEmail)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBot, selectedPeriod])

  const formatPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%"
    const change = ((current - previous) / previous) * 100
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600"
    if (current < previous) return "text-red-600"
    return "text-gray-500"
  }

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-3 w-3" />
    if (current < previous) return <TrendingDown className="h-3 w-3" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#038a71]"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
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
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {(["today", "last7days", "last30days", "alltime"] as TimePeriod[]).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period)}
              className={selectedPeriod === period ? "bg-[#038a71] hover:bg-[#038a71]/90" : ""}
            >
              {getPeriodLabel(period)}
            </Button>
          ))}
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            onClick={() => setSelectedPeriod("custom")}
            className={selectedPeriod === "custom" ? "bg-[#038a71] hover:bg-[#038a71]/90" : ""}
            disabled
          >
            Custom (Coming Soon)
          </Button>
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
              <h2 className="text-lg font-medium text-[#212121]">Dropped Callbacks</h2>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-red-600">{metrics.droppedCallbacks}</p>
            </div>
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.droppedCallbacks, metrics.previousPeriodComparison.droppedCallbacks)}`}
            >
              {getChangeIcon(metrics.droppedCallbacks, metrics.previousPeriodComparison.droppedCallbacks)}
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
            <div
              className={`flex items-center text-sm ${getChangeColor(metrics.averageResponseTime, metrics.previousPeriodComparison.averageResponseTime)}`}
            >
              {getChangeIcon(metrics.averageResponseTime, metrics.previousPeriodComparison.averageResponseTime)}
              <span className="ml-1">
                {formatPercentageChange(
                  metrics.averageResponseTime,
                  metrics.previousPeriodComparison.averageResponseTime,
                )}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-[#616161] mb-2">Average Response Time</p>
            <p className="text-3xl font-bold text-[#038a71]">{(metrics.averageResponseTime / 1000).toFixed(1)}s</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-[#616161]">Current Period</span>
              <span className="font-medium text-[#212121]">{(metrics.averageResponseTime / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-[#616161]">Previous Period</span>
              <span className="font-medium text-[#212121]">
                {(metrics.previousPeriodComparison.averageResponseTime / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
