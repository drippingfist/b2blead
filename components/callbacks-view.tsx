"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Phone, Mail, Calendar, DollarSign, TrendingUp, Info } from "lucide-react"
import { formatPhoneNumber } from "@/lib/utils"
import { getCallbacks } from "@/lib/simple-database"
import Link from "next/link"

interface Callback {
  id: string
  thread_id: string
  phone_number?: string
  email?: string
  created_at: string
  revenue?: number
  bot_name: string
}

interface CallbacksViewProps {
  initialCallbacks: Callback[]
  botId?: string
}

export function CallbacksView({ initialCallbacks, botId }: CallbacksViewProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>(initialCallbacks)
  const [searchTerm, setSearchTerm] = useState("")
  const [period, setPeriod] = useState("7")
  const [loading, setLoading] = useState(false)

  // Filter callbacks based on search term
  const filteredCallbacks = callbacks.filter((callback) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      callback.phone_number?.toLowerCase().includes(searchLower) ||
      callback.email?.toLowerCase().includes(searchLower) ||
      callback.bot_name.toLowerCase().includes(searchLower)
    )
  })

  // Calculate stats
  const totalCallbacks = filteredCallbacks.length
  const callbacksWithContact = filteredCallbacks.filter((c) => c.phone_number || c.email).length
  const conversionRate = totalCallbacks > 0 ? ((callbacksWithContact / totalCallbacks) * 100).toFixed(1) : "0"
  const totalRevenue = filteredCallbacks.reduce((sum, c) => sum + (c.revenue || 0), 0)

  // Refresh data when period changes
  useEffect(() => {
    const refreshData = async () => {
      setLoading(true)
      try {
        const newCallbacks = await getCallbacks(botId, Number.parseInt(period))
        setCallbacks(newCallbacks)
      } catch (error) {
        console.error("Failed to refresh callbacks:", error)
      } finally {
        setLoading(false)
      }
    }

    refreshData()
  }, [period, botId])

  // Group callbacks by date for mobile view
  const groupedCallbacks = filteredCallbacks.reduce(
    (groups, callback) => {
      const date = new Date(callback.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(callback)
      return groups
    },
    {} as Record<string, Callback[]>,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Callback Requests</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search callbacks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-sm font-medium">Callback Requests</CardTitle>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  This is total number of callback requests (whether or not the user provided their contact details).
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCallbacks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-sm font-medium">Callbacks Dropped</CardTitle>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Callbacks where the visitor didn't leave contact information.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCallbacks - callbacksWithContact}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Percentage of callback requests where contact information was provided.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Recent Callbacks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredCallbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No callbacks found for the selected period.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bot</TableHead>
                    {filteredCallbacks.some((c) => c.phone_number) && <TableHead>Phone</TableHead>}
                    {filteredCallbacks.some((c) => c.email) && <TableHead>Email</TableHead>}
                    {filteredCallbacks.some((c) => c.revenue) && <TableHead>Revenue</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallbacks.map((callback) => (
                    <TableRow key={callback.id}>
                      <TableCell>{new Date(callback.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{callback.bot_name}</TableCell>
                      {filteredCallbacks.some((c) => c.phone_number) && (
                        <TableCell>{callback.phone_number ? formatPhoneNumber(callback.phone_number) : "-"}</TableCell>
                      )}
                      {filteredCallbacks.some((c) => c.email) && <TableCell>{callback.email || "-"}</TableCell>}
                      {filteredCallbacks.some((c) => c.revenue) && (
                        <TableCell>{callback.revenue ? `$${callback.revenue.toLocaleString()}` : "-"}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/thread/${callback.thread_id}`}>View Thread</Link>
                          </Button>
                          {callback.email && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${callback.email}`}>Email</a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">Loading...</CardContent>
          </Card>
        ) : filteredCallbacks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No callbacks found for the selected period.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedCallbacks).map(([date, dateCallbacks]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {date}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dateCallbacks.map((callback) => (
                  <div key={callback.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{callback.bot_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(callback.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {callback.revenue && (
                        <span className="text-green-600 font-medium">${callback.revenue.toLocaleString()}</span>
                      )}
                    </div>

                    {(callback.phone_number || callback.email) && (
                      <div className="space-y-1">
                        {callback.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            {formatPhoneNumber(callback.phone_number)}
                          </div>
                        )}
                        {callback.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4" />
                            {callback.email}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/thread/${callback.thread_id}`}>View Thread</Link>
                      </Button>
                      {callback.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${callback.email}`}>Email</a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
