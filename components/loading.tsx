import { Loader2 } from "lucide-react"

interface LoadingProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function Loading({ message = "Loading...", size = "md", className = "" }: LoadingProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="flex flex-col items-center">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-[#038a71] mb-2`} />
        <span className={`${textSizeClasses[size]} text-gray-600`}>{message}</span>
      </div>
    </div>
  )
}
