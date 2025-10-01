"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function SystemSettingsPage() {
  const [notificationEmail, setNotificationEmail] = useState("")
  const [publicContactEmail, setPublicContactEmail] = useState("")
  const [publicContactPhone, setPublicContactPhone] = useState("")
  const [publicContactLocation, setPublicContactLocation] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/settings")
      if (!response.ok) throw new Error("Failed to fetch settings")

      const data = await response.json()
      setNotificationEmail(data.notificationEmail || "")
      setPublicContactEmail(data.publicContactEmail || "")
      setPublicContactPhone(data.publicContactPhone || "")
      setPublicContactLocation(data.publicContactLocation || "")
    } catch (error) {
      toast.error("Failed to load settings")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationEmail,
          publicContactEmail,
          publicContactPhone,
          publicContactLocation,
        }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">System Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure where contact form submissions will be sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                placeholder="admin@example.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                This email will receive notifications when users submit the contact form
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Contact Information</CardTitle>
            <CardDescription>
              Contact details displayed on the contact page. Leave empty to hide a field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publicContactEmail">Public Contact Email</Label>
              <Input
                id="publicContactEmail"
                type="email"
                placeholder="hello@nammapaisa.com"
                value={publicContactEmail}
                onChange={(e) => setPublicContactEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Email address displayed to users for contacting Namma Paisa
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicContactPhone">Phone Number</Label>
              <Input
                id="publicContactPhone"
                type="tel"
                placeholder="+91 98765 43210"
                value={publicContactPhone}
                onChange={(e) => setPublicContactPhone(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Phone number displayed to users
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicContactLocation">Location</Label>
              <Input
                id="publicContactLocation"
                type="text"
                placeholder="Bangalore, India"
                value={publicContactLocation}
                onChange={(e) => setPublicContactLocation(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Location displayed to users
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </form>
    </div>
  )
}
