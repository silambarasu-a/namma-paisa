"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already-verified">("loading")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setMessage("Invalid verification link")
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus("already-verified")
            setMessage(data.message)
          } else {
            setStatus("success")
            setMessage(data.message)
          }
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed")
        }
      } catch (error) {
        setStatus("error")
        setMessage("An error occurred during verification")
      }
    }

    verifyEmail()
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            {status === "loading" && "Verifying your email address..."}
            {status === "success" && "Verification successful!"}
            {status === "already-verified" && "Already verified"}
            {status === "error" && "Verification failed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600" />
                <p className="text-center text-muted-foreground">{message}</p>
                <Button onClick={() => router.push("/auth/signin")} className="w-full">
                  Sign In
                </Button>
              </>
            )}

            {status === "already-verified" && (
              <>
                <CheckCircle className="h-16 w-16 text-blue-600" />
                <p className="text-center text-muted-foreground">{message}</p>
                <Button onClick={() => router.push("/auth/signin")} className="w-full">
                  Sign In
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-600" />
                <p className="text-center text-muted-foreground">{message}</p>
                <div className="w-full space-y-2">
                  <Button onClick={() => router.push("/auth/signup")} variant="outline" className="w-full">
                    Sign Up Again
                  </Button>
                  <Link href="/auth/signin" className="block">
                    <Button variant="ghost" className="w-full">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
