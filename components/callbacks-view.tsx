"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import { Box, Typography, CircularProgress } from "@mui/material"

interface Callback {
  id: string
  timestamp: string
  topic: string
  message: string
}

const CallbacksView: React.FC = () => {
  const [callbacks, setCallbacks] = useState<Callback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching callbacks from an API
    const fetchCallbacks = async () => {
      setLoading(true)
      try {
        // Replace this with your actual API endpoint
        const response = await fetch("/api/callbacks")
        const data = await response.json()
        setCallbacks(data)
      } catch (error) {
        console.error("Error fetching callbacks:", error)
        // Handle error appropriately (e.g., display an error message)
      } finally {
        setLoading(false)
      }
    }

    fetchCallbacks()

    // Refresh callbacks every 5 seconds (adjust as needed)
    const intervalId = setInterval(fetchCallbacks, 5000)

    return () => clearInterval(intervalId) // Cleanup interval on unmount
  }, [])

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 220 },
    { field: "timestamp", headerName: "Timestamp", width: 150 },
    { field: "topic", headerName: "Topic", width: 200 },
    { field: "message", headerName: "Message", width: 300 },
  ]

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Callbacks</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid rows={callbacks} columns={columns} pageSize={5} rowsPerPageOptions={[5, 10, 20]} autoHeight />
      )}
    </Box>
  )
}

export default CallbacksView
