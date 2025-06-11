"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "react-hot-toast"
import { FaGoogle } from "react-icons/fa"

const LoginForm = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!email || !password) {
      toast.error("Please fill in all fields.")
      setLoading(false)
      return
    }

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        toast.error("Invalid Credentials")
        setLoading(false)
        return
      }

      toast.success("Login Successful!")
      router.replace("/dashboard")
    } catch (error) {
      console.error("Error during login:", error)
      toast.error("An error occurred during login.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    signIn("google", { callbackUrl: "http://localhost:3000/dashboard" })
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#038a71]">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className={`bg-[#038a71] hover:bg-[#026b5a] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging In..." : "Login"}
            </button>
          </div>
        </form>
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            <FaGoogle className="inline-block mr-2" />
            Sign In with Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
