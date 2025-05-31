"use client"

import { useState } from "react"

interface DebugDataProps {
  data: any
  title?: string
}

export default function DebugData({ data, title = "Debug Data" }: DebugDataProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm">
        {isOpen ? "Hide" : "Show"} {title}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">{title}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
