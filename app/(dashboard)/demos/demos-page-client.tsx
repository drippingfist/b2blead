"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Bot {
  id: string
  bot_share_name: string
  client_name: string
  created_at: string
  demo_expiry_date: string | null
}

interface DemosPageClientProps {
  bots: Bot[]
}

type SortField = "client_name" | "bot_share_name" | "created_at" | "demo_expiry_date"
type SortDirection = "asc" | "desc"

export default function DemosPageClient({ bots }: DemosPageClientProps) {
  const [sortField, setSortField] = useState<SortField>("client_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedBots = [...bots].sort((a, b) => {
    let aValue: string | Date | null
    let bValue: string | Date | null

    if (sortField === "created_at" || sortField === "demo_expiry_date") {
      aValue = a[sortField] ? new Date(a[sortField]) : null
      bValue = b[sortField] ? new Date(b[sortField]) : null

      // Handle null values - put them at the end
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return sortDirection === "asc" ? 1 : -1
      if (bValue === null) return sortDirection === "asc" ? -1 : 1
    } else {
      aValue = a[sortField].toLowerCase()
      bValue = b[sortField].toLowerCase()
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiry date"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button variant="ghost" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => handleSort(field)}>
      <span className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4" />
        )}
      </span>
    </Button>
  )

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#212121]">Demo Bots</h1>
        <p className="text-[#616161]">A list of all bots configured for demonstration purposes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Click on a bot to view and edit its configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="client_name">Client Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="bot_share_name">Bot Share Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="created_at">Created At</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="demo_expiry_date">Expiry Date</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBots.length > 0 ? (
                sortedBots.map((bot) => (
                  <TableRow key={bot.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/demos/${bot.bot_share_name}`} className="block w-full h-full">
                        {bot.client_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/demos/${bot.bot_share_name}`} className="block w-full h-full font-mono text-sm">
                        {bot.bot_share_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/demos/${bot.bot_share_name}`}
                        className="block w-full h-full text-sm text-muted-foreground"
                      >
                        {formatDate(bot.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/demos/${bot.bot_share_name}`}
                        className="block w-full h-full text-sm text-muted-foreground"
                      >
                        {formatDate(bot.demo_expiry_date)}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No demo bots found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
