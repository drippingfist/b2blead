"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, X, CreditCard, Receipt, Users, Info, User } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  const [userData, setUserData] = useState({
    id: "",
    email: "",
    firstName: "",
    surname: "",
    timezone: "Asia/Bangkok",
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error(userError?.message || "Failed to load user data")
        }

        console.log("Checking access for user:", user.id)

        // Check if user is superadmin first - check bot_super_users table
        const { data: superAdminDataResult, error: superAdminError } = await supabase
          .from("bot_super_users")
          .select("id")
          .eq("id", user.id)

        if (superAdminError) {
          console.error("Error checking bot_super_users:", superAdminError)
        }

        // If user is in bot_super_users, they are a superadmin
        if (superAdminDataResult && superAdminDataResult.length > 0) {
          console.log("User is superadmin via bot_super_users table")
          setHasAccess(true)
        } else {
          console.log("User is not a superadmin, checking bot_users for admin access...")

          // Check if user has admin role in bot_users table
          const { data: botUserDataResult, error: botUserError } = await supabase
            .from("bot_users")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")

          if (botUserError) {
            console.error("Error checking bot_users for admin role:", botUserError)
            setError("Error checking permissions")
            setLoading(false)
            return
          }

          // If user has admin role on any bot, they can access profile page
          if (botUserDataResult && botUserDataResult.length > 0) {
            console.log("User has admin access via bot_users table")
            setHasAccess(true)
          } else {
            console.log("User has no admin access")
            setError("You don't have permission to access this page")
            router.push("/dashboard")
            return
          }
        }

        // Load user profile data
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("first_name, surname")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error loading user profile:", profileError)
        }

        setUserData({
          id: user.id,
          email: user.email || "",
          firstName: profile?.first_name || "",
          surname: profile?.surname || "",
          timezone: "Asia/Bangkok", // Default timezone
        })
      } catch (err: any) {
        console.error("Error loading user data:", err)
        setError(err.message || "Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

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

  if (loading) {
    console.log("Profile page is loading...")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#038a71]" />
      </div>
    )
  }

  if (!hasAccess) {
    console.log("Not showing profile page because user doesn't have access")
    return (
      <div className="p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          You don't have permission to access the profile page. Only admins and superadmins can view this page.
        </div>
        <Button onClick={() => router.push("/dashboard")} className="bg-[#038a71] hover:bg-[#038a71]/90">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#212121] flex items-center">
            <User className="h-6 w-6 mr-2" />
            Profile
          </h1>
          <p className="text-[#616161]">Manage your profile, billing, and referral settings.</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#038a71] hover:bg-[#038a71]/90 flex items-center"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Your profile has been saved successfully.
        </div>
      )}

      <div className="w-full md:w-[60%] space-y-6">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg border border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-medium text-[#212121] mb-4">Profile</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={userData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  disabled={loading || saving}
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
                  disabled={loading || saving}
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
