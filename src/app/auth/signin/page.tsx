"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Role } from "@/constants"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Redirect if user is already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const roles = session.user.roles as string[] || []

      // Super admins without customer role go to admin
      if (roles.includes(Role.SUPER_ADMIN) && !roles.includes(Role.CUSTOMER)) {
        router.replace("/admin")
      } else {
        // Everyone else goes to dashboard
        router.replace("/dashboard")
      }
    }
  }, [status, session, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the form if already authenticated (will redirect)
  if (status === "authenticated") {
    return null
  }

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setShowResendVerification(false)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Check if error is due to blocked user
        if (result.error.includes("BLOCKED_USER")) {
          toast.error("You have been blocked by the admin", {
            duration: 5000,
          })
        } else if (result.error.includes("EMAIL_NOT_VERIFIED")) {
          setShowResendVerification(true)
          toast.error("Please verify your email before signing in. Check your inbox for the verification link.", {
            duration: 6000,
          })
        } else {
          toast.error("Invalid email or password")
        }
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    if (cooldownSeconds > 0) {
      toast.error(`Please wait ${cooldownSeconds} seconds before resending`)
      return
    }

    setIsResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setCooldownSeconds(60)
        toast.success("Verification email sent! Please check your inbox.", {
          duration: 5000,
        })
      } else {
        toast.error(data.message || "Failed to resend verification email")
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access Namma Paisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            {showResendVerification && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Your email is not verified. Click below to resend the verification email.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={isResending || cooldownSeconds > 0}
                >
                  {isResending
                    ? "Sending..."
                    : cooldownSeconds > 0
                    ? `Resend in ${cooldownSeconds}s`
                    : "Resend Verification Email"}
                </Button>
              </div>
            )}

            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}