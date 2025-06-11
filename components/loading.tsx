import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function Loading({ message = "Loading...", size = "md", className }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={cn("flex items-center justify-center h-64", className)}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-[#038a71]")} />
      <span className="ml-2 text-gray-600">{message}</span>
    </div>
  )
}
