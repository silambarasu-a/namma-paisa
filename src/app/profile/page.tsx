"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CalendarDays, DollarSign, Trash2 } from "lucide-react"

interface SalaryHistory {
  id: string
  netSalary: number
  effectiveFrom: string
  createdAt: string
}

export default function Profile() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([])

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [netSalary, setNetSalary] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setEmail(session.user.email || "")
    }
    fetchSalaryHistory()
  }, [session])

  const fetchSalaryHistory = async () => {
    try {
      const response = await fetch("/api/profile/salary-history")
      if (response.ok) {
        const data = await response.json()
        console.log("Salary history data:", data)
        setSalaryHistory(data)
      } else {
        console.error("Failed to fetch salary history:", response.status)
      }
    } catch (error) {
      console.error("Failed to fetch salary history:", error)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      })

      if (response.ok) {
        await update({ name, email })
        toast.success("Profile updated successfully!")
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to update profile")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        toast.success("Password changed successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to change password")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSalaryUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!netSalary || !effectiveDate) {
      toast.error("Please fill in all salary fields")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/profile/salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          netMonthly: parseFloat(netSalary),
          effectiveFrom: effectiveDate,
        }),
      })

      if (response.ok) {
        toast.success("Salary updated successfully!")
        setNetSalary("")
        setEffectiveDate("")
        fetchSalaryHistory()
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to update salary")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSalary = async (id: string) => {
    if (!confirm("Are you sure you want to delete this salary entry?")) {
      return
    }

    try {
      const response = await fetch("/api/profile/salary", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        toast.success("Salary entry deleted successfully!")
        fetchSalaryHistory()
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to delete salary entry")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    }
  }

  if (!session?.user) {
    return <div>Loading...</div>
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and salary information
        </p>
      </div>

      <div className="flex items-center space-x-4 p-6 bg-white dark:bg-gray-800 rounded-lg border">
        <Avatar className="h-20 w-20">
          <AvatarImage src={session.user.image || ""} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{session.user.name}</h2>
          <p className="text-gray-600 dark:text-gray-400">{session.user.email}</p>
          <Badge variant={session.user.role === "SUPER_ADMIN" ? "destructive" : "default"}>
            {session.user.role === "SUPER_ADMIN" ? "Super Admin" : "Customer"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile Info</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="salary">Net Salary</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Update Net Salary</CardTitle>
                <CardDescription>
                  Set your monthly net salary for budget calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSalaryUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="netSalary">Monthly Net Salary (₹)</Label>
                      <Input
                        id="netSalary"
                        type="number"
                        step="0.01"
                        value={netSalary}
                        onChange={(e) => setNetSalary(e.target.value)}
                        placeholder="85000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="effectiveDate">Effective From</Label>
                      <Input
                        id="effectiveDate"
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Salary"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salary History</CardTitle>
                <CardDescription>
                  Your net salary changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salaryHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No salary history yet. Add your first salary entry above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {salaryHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold">
                              ₹{entry.netSalary.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Monthly Net Salary
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              From {new Date(entry.effectiveFrom).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSalary(entry.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}