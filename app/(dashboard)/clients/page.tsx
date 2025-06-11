import { redirect } from "next/navigation"

export default function ClientsPage() {
  // Redirect to bots page since clients table was renamed to bots
  redirect("/bots")
}
