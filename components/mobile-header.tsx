"use client"

import { Menu } from "lucide-react"

interface MobileHeaderProps {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="md:hidden bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuClick} className="p-2 rounded-md text-[#616161] hover:text-[#212121] hover:bg-gray-100">
        <Menu className="h-6 w-6" />
      </button>
      <img src="/logo.svg" alt="b2bLEAD.ai" className="h-8 w-auto" />
      <div className="w-10" /> {/* Spacer for centering */}
    </div>
  )
}
