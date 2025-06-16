"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe,
  Building,
  DollarSign,
  MapPin,
  User,
  MoreVertical,
  Info,
  Calendar,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Callback } from "@/lib/database"

interface CallbacksViewProps {
  initialCallbacks: Callback[]
  stats: {
    recentCallbacks: number
    callbacksDropped: number
    conversionRate: number
    totalThreads: number
  }
  columnConfig: {
    hasCompany: boolean
    hasCountry: boolean
    hasUrl: boolean
    hasPhone: boolean
    hasRevenue: boolean
  }
  onPeriodChange: (period: string) => void
  selectedPeriod: string
}

export default function CallbacksView({
  initialCallbacks,
  stats,
  columnConfig,
  onPeriodChange,
  selectedPeriod,
}: CallbacksViewProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter callbacks based on search query
  const filteredCallbacks = searchQuery
    ? initialCallbacks.filter(
        (callback) =>
          callback.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_cb_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.message_preview?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : initialCallbacks

  // Group callbacks by date
  const groupedCallbacks = filteredCallbacks.reduce((groups: { [key: string]: Callback[] }, callback) => {
    const date = new Date(callback.created_at).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(callback)
    return groups
  }, {})

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "-"
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const getRevenueDisplay = (revenue?: string) => {
    if (!revenue) return "Not disclosed"
    return revenue
  }

  const getPeriodLabel = (period: string) => {
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
      default:
        return "Last 30 days"
    }
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Callbacks</h1>
          <p className="text-[#616161]">Manage your callback requests and customer information.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-[#616161]" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
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
          <Button className="bg-[#038a71] hover:bg-[#038a71]/90 w-full md:w-auto">Export Callbacks</Button>
        </div>
      </div>

      {/* Stats Cards - Removed Total Callbacks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Callback Requests</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.recentCallbacks}</p>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center space-x-1">
            <h2 className="text-lg font-medium text-[#212121]">Callbacks Dropped</h2>
            <div className="group relative">
              <Info className="h-4 w-4 text-[#616161] cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Number of times a user requested a callback but didn't complete the callback flow
              </div>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.callbacksDropped}</p>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <div className="flex items-center space-x-1">
            <h2 className="text-lg font-medium text-[#212121]">Conversion Rate</h2>
            <div className="group relative">
              <Info className="h-4 w-4 text-[#616161] cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Percentage of threads that resulted in a callback request
              </div>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.conversionRate}%</p>
          <p className="text-sm text-[#616161] mt-1">{getPeriodLabel(selectedPeriod)}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#616161] h-4 w-4" />
          <input
            type="text"
            placeholder="Search callbacks..."
            className="pl-10 pr-4 py-2 w-full border border-[#e0e0e0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#038a71]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-sm text-[#616161]">
              1 - {Math.min(50, filteredCallbacks.length)} of {filteredCallbacks.length}
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-[#616161]" />
              </button>
              <button className="p-1 rounded-md hover:bg-gray-100">
                <ChevronRight className="h-5 w-5 text-[#616161]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Debug: Found {initialCallbacks.length} callbacks. Sample data:{" "}
            {JSON.stringify(initialCallbacks[0], null, 2)}
          </p>
        </div>
      )}

      {/* Dynamic Desktop Table */}
      <div className="hidden lg:block border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider w-[20%]">
                Contact Info
              </th>
              {columnConfig.hasCompany && (
                <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                  Company
                </th>
              )}
              {columnConfig.hasCountry && (
                <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                  Location
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Summary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedCallbacks).map(([date, dateCallbacks]) => (
              <>
                <tr key={`date-${date}`} className="bg-gray-50">
                  <td
                    colSpan={5 + (columnConfig.hasCompany ? 1 : 0) + (columnConfig.hasCountry ? 1 : 0)}
                    className="px-6 py-2 text-sm font-medium text-[#616161]"
                  >
                    {date}
                  </td>
                </tr>
                {dateCallbacks.slice(0, 10).map((callback) => (
                  <tr key={callback.id} className="bg-white hover:bg-[#f5f5f5] border-t border-[#e0e0e0]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#212121]">
                      {new Date(callback.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 w-[20%]">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[#212121] flex items-center">
                          <User className="h-4 w-4 mr-1 text-[#616161] flex-shrink-0" />
                          <span className="truncate">
                            {callback.user_name ||
                              `${callback.user_first_name || ""} ${callback.user_surname || ""}`.trim() ||
                              "Anonymous"}
                          </span>
                        </div>
                        {callback.user_email && (
                          <div className="text-xs text-[#616161] flex items-center">
                            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{callback.user_email}</span>
                          </div>
                        )}
                        <div className="text-xs text-[#616161] flex items-center">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatPhoneNumber(callback.user_phone)}</span>
                        </div>
                      </div>
                    </td>
                    {columnConfig.hasCompany && (
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {callback.user_company && (
                            <div className="text-sm text-[#212121] flex items-center">
                              <Building className="h-4 w-4 mr-1 text-[#616161]" />
                              {callback.user_company}
                            </div>
                          )}
                          {columnConfig.hasRevenue && callback.user_revenue && (
                            <div className="text-xs text-[#616161] flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {getRevenueDisplay(callback.user_revenue)}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {columnConfig.hasCountry && (
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {callback.user_country && (
                            <div className="text-sm text-[#212121] flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-[#616161]" />
                              {callback.user_country}
                            </div>
                          )}
                          {columnConfig.hasUrl && callback.user_url && (
                            <div className="text-xs text-[#616161] flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              <a
                                href={callback.user_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                Website
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-[#212121] flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1 text-[#616161] flex-shrink-0" />
                        {callback.thread_table_id && callback.message_preview ? (
                          <Link
                            href={`/thread/${callback.thread_table_id}`}
                            className="truncate hover:underline text-[#212121] hover:text-[#038a71]"
                          >
                            {callback.message_preview}
                          </Link>
                        ) : callback.message_preview ? (
                          <span className="truncate">{callback.message_preview}</span>
                        ) : (
                          <span className="truncate text-gray-500">No subject available</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-[#212121] truncate">
                        {callback.user_cb_message || "No message provided"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {callback.user_email ? (
                          <a
                            href={`mailto:${callback.user_email}`}
                            className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-3 py-1 rounded text-xs"
                          >
                            Email
                          </a>
                        ) : (
                          <span className="text-gray-400 px-3 py-1 rounded text-xs">No email</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {Object.entries(groupedCallbacks).map(([date, dateCallbacks]) => (
          <div key={`mobile-date-${date}`}>
            <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-[#616161] rounded-t-md border border-[#e0e0e0]">
              {date}
            </div>
            <div className="space-y-2">
              {dateCallbacks.slice(0, 10).map((callback) => (
                <div
                  key={`mobile-${callback.id}`}
                  className="bg-white border border-[#e0e0e0] border-t-0 last:rounded-b-md p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-[#212121]">
                        {new Date(callback.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <button className="text-[#616161] hover:text-[#212121]">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-[#616161]" />
                      <span className="text-sm font-medium text-[#212121]">
                        {callback.user_name ||
                          `${callback.user_first_name || ""} ${callback.user_surname || ""}`.trim() ||
                          "Anonymous"}
                      </span>
                    </div>

                    {callback.user_email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-[#616161]" />
                        <span className="text-sm text-[#212121]">{callback.user_email}</span>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-[#616161]" />
                      <span className="text-sm text-[#212121]">{formatPhoneNumber(callback.user_phone)}</span>
                    </div>

                    {callback.user_company && (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-[#616161]" />
                        <span className="text-sm text-[#212121]">{callback.user_company}</span>
                      </div>
                    )}

                    {callback.user_country && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-[#616161]" />
                        <span className="text-sm text-[#212121]">{callback.user_country}</span>
                      </div>
                    )}
                  </div>

                  {callback.message_preview && (
                    <div className="mb-3">
                      <p className="text-sm text-[#616161] mb-1">Summary:</p>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 text-[#616161]" />
                        {callback.thread_table_id ? (
                          <Link
                            href={`/thread/${callback.thread_table_id}`}
                            className="text-sm text-[#212121] hover:text-[#038a71] hover:underline"
                          >
                            {callback.message_preview}
                          </Link>
                        ) : (
                          <p className="text-sm text-[#212121]">{callback.message_preview}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {callback.user_cb_message && (
                    <div className="mb-3">
                      <p className="text-sm text-[#616161] mb-1">Message:</p>
                      <p className="text-sm text-[#212121]">{callback.user_cb_message}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {callback.user_email ? (
                      <a
                        href={`mailto:${callback.user_email}`}
                        className="flex-1 bg-[#038a71] hover:bg-[#038a71]/90 text-white px-3 py-2 rounded-md text-sm text-center"
                      >
                        Send Email
                      </a>
                    ) : (
                      <span className="flex-1 text-gray-400 px-3 py-2 rounded-md text-sm text-center border border-gray-200">
                        No email available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {initialCallbacks.length === 0 && (
        <div className="text-center py-12">
          <Phone className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <p className="text-[#616161]">No callback requests found.</p>
        </div>
      )}
    </div>
  )
}
