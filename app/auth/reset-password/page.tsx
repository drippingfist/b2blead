// app/auth/reset-password/page.tsx
import PasswordResetHandler from "@/components/password-reset-handler"
import { Suspense } from "react"
import Loading from "@/components/loading"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PasswordResetHandler />
    </Suspense>
  )
}
