"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X, CreditCard, Receipt, Users, Info, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Loading from "@/components/loading"

interface AdminPageClientProps {
  initialUserData: {
    id: string
    email: string
    firstName: string
    surname: string
  }
  isSuperAdmin: boolean
}

export default function AdminPageClient({ initialUserData, isSuperAdmin }: AdminPageClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [userData, setUserData] = useState({
    ...initialUserData,
    timezone: "Asia/Bangkok",
  })

  const handleChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (success) setSuccess(false)
  }

  const handleCancel = () => {
    router.push("/dashboard")
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Update user profile
      const { error: updateError } = await supabase.from("user_profiles").upsert({
        id: userData.id,
        first_name: userData.firstName,
        surname: userData.surname,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
    } catch (err: any) {
      console.error("Error saving user data:", err)
      setError(err.message || "Failed to save user data")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121] flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Admin Panel
          </h1>
          <p className="text-[#616161]">Manage system-wide settings and your admin profile.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
          >
            {saving ? <Loading size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Your admin settings have been saved successfully.
        </div>
      )}

      <div className="w-full md:w-[60%] space-y-6">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Admin Profile</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={userData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  disabled={saving}
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  value={userData.surname}
                  onChange={(e) => handleChange("surname", e.target.value)}
                  placeholder="Enter your surname"
                  disabled={saving}
                  className="border-[#e0e0e0] focus:border-[#038a71] focus:ring-[#038a71]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={userData.email}
                disabled={true}
                className="bg-gray-50 border-[#e0e0e0] text-gray-500"
              />
              <p className="text-xs text-[#616161]">Email address cannot be changed.</p>
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Billing Management
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-[#e0e0e0]">
                <span className="text-sm text-[#212121]">Monthly</span>
                <Button variant="outline" size="sm">
                  Change Plan
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <Receipt className="h-4 w-4 mr-2" />
                Invoices
              </Label>
              <div className="p-3 bg-gray-50 rounded-md border border-[#e0e0e0]">
                <p className="text-sm text-[#616161]">No invoices available</p>
                <Button variant="outline" size="sm" className="mt-2">
                  View All Invoices
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Methods</Label>
              <div className="p-3 bg-gray-50 rounded-md border border-[#e0e0e0]">
                <p className="text-sm text-[#616161]">No payment methods added</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Payment Method
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals Section */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Referral Program
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-[#212121]">Get one free month for each valid referral.</p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How referrals work:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Share your referral link with friends or colleagues</li>
                    <li>They must sign up and complete their first month of service</li>
                    <li>You'll receive one free month added to your account</li>
                    <li>There's no limit to how many referrals you can make</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-[#e0e0e0]">
                <div>
                  <p className="text-sm font-medium text-[#212121]">Your Referral Link</p>
                  <p className="text-xs text-[#616161]">https://b2blead.ai/ref/your-code</p>
                </div>
                <Button variant="outline" size="sm">
                  Copy Link
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-md border border-[#e0e0e0] text-center">
                  <p className="text-2xl font-bold text-[#038a71]">0</p>
                  <p className="text-xs text-[#616161]">Successful Referrals</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-[#e0e0e0] text-center">
                  <p className="text-2xl font-bold text-[#038a71]">0</p>
                  <p className="text-xs text-[#616161]">Free Months Earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
