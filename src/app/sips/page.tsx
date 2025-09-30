import { Metadata } from "next"

export const metadata: Metadata = {
  title: "SIPs",
}


"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, TrendingUp, Calendar, IndianRupee } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"

interface SIP {
  id: string
  name: string
  amount: number
  frequency: "MONTHLY" | "YEARLY" | "CUSTOM"
  customDay?: number | null
  startDate: string
  endDate?: string | null
  isActive: boolean
  description?: string | null
  createdAt: string
  updatedAt: string
}

export default function SIPsPage() {
  const router = useRouter()
  const [sips, setSips] = useState<SIP[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchSIPs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/sips")
      if (!response.ok) throw new Error("Failed to fetch SIPs")
      const data = await response.json()
      setSips(data)
    } catch (error) {
      toast.error("Failed to load SIPs")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSIPs()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sips/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete SIP")
      toast.success("SIP deleted successfully")
      setSips(sips.filter((sip) => sip.id !== id))
    } catch (error) {
      toast.error("Failed to delete SIP")
      console.error(error)
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setTogglingId(id)
      const response = await fetch(`/api/sips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (!response.ok) throw new Error("Failed to update SIP")
      const updatedSip = await response.json()
      setSips(sips.map((sip) => (sip.id === id ? updatedSip : sip)))
      toast.success(`SIP ${!currentStatus ? "activated" : "deactivated"}`)
    } catch (error) {
      toast.error("Failed to update SIP status")
      console.error(error)
    } finally {
      setTogglingId(null)
    }
  }

  const calculateTotals = () => {
    const activeSips = sips.filter((sip) => sip.isActive)
    const monthlyTotal = activeSips.reduce((sum, sip) => {
      const amount = Number(sip.amount)
      if (sip.frequency === "MONTHLY" || sip.frequency === "CUSTOM") {
        return sum + amount
      } else if (sip.frequency === "YEARLY") {
        return sum + amount / 12
      }
      return sum
    }, 0)

    const yearlyTotal = activeSips.reduce((sum, sip) => {
      const amount = Number(sip.amount)
      if (sip.frequency === "MONTHLY" || sip.frequency === "CUSTOM") {
        return sum + amount * 12
      } else if (sip.frequency === "YEARLY") {
        return sum + amount
      }
      return sum
    }, 0)

    return { monthlyTotal, yearlyTotal }
  }

  const { monthlyTotal, yearlyTotal } = calculateTotals()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getFrequencyBadge = (frequency: string, customDay?: number | null) => {
    if (frequency === "CUSTOM" && customDay) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Custom (Day {customDay})
        </Badge>
      )
    }
    const colors = {
      MONTHLY: "bg-blue-50 text-blue-700 border-blue-200",
      YEARLY: "bg-green-50 text-green-700 border-green-200",
      CUSTOM: "bg-purple-50 text-purple-700 border-purple-200",
    }
    return (
      <Badge variant="outline" className={colors[frequency as keyof typeof colors]}>
        {frequency === "MONTHLY" ? "Monthly" : frequency === "YEARLY" ? "Yearly" : "Custom"}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
          <h1 className="text-3xl font-bold text-white">SIP Management</h1>
          <p className="text-blue-100 dark:text-blue-200 mt-2">
            Loading your systematic investment plans...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">SIP Management</h1>
            <p className="text-blue-100 dark:text-blue-200 mt-2">
              Manage your systematic investment plans
            </p>
          </div>
          <Button
            onClick={() => router.push("/sips/new")}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New SIP
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 -mt-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active SIPs</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {sips.filter((sip) => sip.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sips.length - sips.filter((sip) => sip.isActive).length} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Commitment</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(monthlyTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active SIPs only</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Commitment</CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(yearlyTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active SIPs only</p>
          </CardContent>
        </Card>
      </div>

      {/* SIPs Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your SIPs</CardTitle>
          <CardDescription>
            {sips.length === 0
              ? "No SIPs found. Start by adding your first SIP."
              : `Showing ${sips.length} SIP${sips.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sips.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No SIPs yet</h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first systematic investment plan.
              </p>
              <Button onClick={() => router.push("/sips/new")} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add New SIP
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sips.map((sip) => (
                    <TableRow key={sip.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{sip.name}</div>
                          {sip.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {sip.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(Number(sip.amount))}
                      </TableCell>
                      <TableCell>{getFrequencyBadge(sip.frequency, sip.customDay)}</TableCell>
                      <TableCell>{formatDate(sip.startDate)}</TableCell>
                      <TableCell>
                        {sip.endDate ? formatDate(sip.endDate) : (
                          <span className="text-muted-foreground">Ongoing</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={sip.isActive}
                            onCheckedChange={() => handleToggleActive(sip.id, sip.isActive)}
                            disabled={togglingId === sip.id}
                          />
                          <span className="text-sm">
                            {sip.isActive ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/sips/${sip.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(sip.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the SIP from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}