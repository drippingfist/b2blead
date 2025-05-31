"use client"

import { useState } from "react"
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Callback } from "@/lib/database"

interface CallbacksViewProps {
  initialCallbacks: Callback[]
  stats: {
    totalCallbacks: number
    recentCallbacks: number
    topCountries: [string, number][]
  }
}

export default function CallbacksView({ initialCallbacks, stats }: CallbacksViewProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>(initialCallbacks)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Filter callbacks based on search query
  const filteredCallbacks = searchQuery
    ? callbacks.filter(
        (callback) =>
          callback.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          callback.user_cb_message?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : callbacks

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
    if (!phone) return "Not provided"
    // Basic phone formatting - you can enhance this
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const getRevenueDisplay = (revenue?: string) => {
    if (!revenue) return "Not disclosed"
    return revenue
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121]">Callbacks</h1>
          <p className="text-[#616161]">Manage your callback requests and customer information.</p>
        </div>
        <Button className="bg-[#038a71] hover:bg-[#038a71]/90 w-full md:w-auto">Export Callbacks</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Total Callbacks</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.totalCallbacks}</p>
          <p className="text-sm text-[#616161] mt-1">All time</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Recent Requests</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.recentCallbacks}</p>
          <p className="text-sm text-[#616161] mt-1">Last 7 days</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Top Country</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">{stats.topCountries[0]?.[0] || "N/A"}</p>
          <p className="text-sm text-[#616161] mt-1">{stats.topCountries[0]?.[1] || 0} requests</p>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121]">Conversion Rate</h2>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-[#038a71]">
            {callbacks.length > 0 ? Math.round((stats.recentCallbacks / stats.totalCallbacks) * 100) : 0}%
          </p>
          <p className="text-sm text-[#616161] mt-1">Recent activity</p>
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
          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-[#616161] mr-2" />
            <span className="text-sm text-[#616161]">Filters</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

          <div className="flex items-center border border-[#e0e0e0] rounded-md px-3 py-2">
            <span className="text-sm text-[#616161]">All Status</span>
            <ChevronDown className="h-4 w-4 text-[#616161] ml-2" />
          </div>

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

      {/* Desktop Table */}
      <div className="hidden lg:block border border-[#e0e0e0] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-[#e0e0e0]">
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                <div className="flex items-center">
                  Date
                  <ChevronDown className="h-4 w-4 ml-1" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#616161] uppercase tracking-wider">
                Location
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
                  <td colSpan={6} className="px-6 py-2 text-sm font-medium text-[#616161]">
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
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[#212121] flex items-center">
                          <User className="h-4 w-4 mr-1 text-[#616161]" />
                          {callback.user_name ||
                            `${callback.user_first_name || ""} ${callback.user_surname || ""}`.trim() ||
                            "Anonymous"}
                        </div>
                        {callback.user_email && (
                          <div className="text-xs text-[#616161] flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {callback.user_email}
                          </div>
                        )}
                        {callback.user_phone && (
                          <div className="text-xs text-[#616161] flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {formatPhoneNumber(callback.user_phone)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {callback.user_company && (
                          <div className="text-sm text-[#212121] flex items-center">
                            <Building className="h-4 w-4 mr-1 text-[#616161]" />
                            {callback.user_company}
                          </div>
                        )}
                        {callback.user_revenue && (
                          <div className="text-xs text-[#616161] flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {getRevenueDisplay(callback.user_revenue)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {callback.user_country && (
                          <div className="text-sm text-[#212121] flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-[#616161]" />
                            {callback.user_country}
                          </div>
                        )}
                        {callback.user_url && (
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
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-[#212121] truncate">
                        {callback.user_cb_message || "No message provided"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="bg-[#038a71] hover:bg-[#038a71]/90 text-white px-3 py-1 rounded text-xs">
                          Call
                        </button>
                        <button className="border border-[#e0e0e0] hover:bg-gray-50 text-[#616161] px-3 py-1 rounded text-xs">
                          Email
                        </button>
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
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">New</span>
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

                    {callback.user_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-[#616161]" />
                        <span className="text-sm text-[#212121]">{formatPhoneNumber(callback.user_phone)}</span>
                      </div>
                    )}

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

                  {callback.user_cb_message && (
                    <div className="mb-3">
                      <p className="text-sm text-[#616161] mb-1">Message:</p>
                      <p className="text-sm text-[#212121]">{callback.user_cb_message}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button className="flex-1 bg-[#038a71] hover:bg-[#038a71]/90 text-white px-3 py-2 rounded-md text-sm">
                      Call Now
                    </button>
                    <button className="flex-1 border border-[#e0e0e0] hover:bg-gray-50 text-[#616161] px-3 py-2 rounded-md text-sm">
                      Send Email
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCallbacks.length === 0 && (
        <div className="text-center py-12">
          <Phone className="h-12 w-12 text-[#616161] mx-auto mb-4" />
          <p className="text-[#616161]">No callback requests found.</p>
        </div>
      )}
    </div>
  )
}
