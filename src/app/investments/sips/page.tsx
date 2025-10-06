"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, TrendingUp, Calendar, IndianRupee } from "lucide-react"
import { convertToMonthlyAmount, getFrequencyLabel } from "@/lib/frequency-utils"
import type { SIPFrequency } from "@/types/investment"
import { SIP_FREQUENCY_BADGE_COLORS } from "@/constants"
import SIPDialog from "@/components/SIPDialog"
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
import type { SIP } from "@/types"

export default function SIPsPage() {
  const [sips, setSips] = useState<SIP[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingSipId, setEditingSipId] = useState<string | undefined>()

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
      return sum + convertToMonthlyAmount(amount, sip.frequency)
    }, 0)

    const yearlyTotal = monthlyTotal * 12

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
        <Badge variant="outline" className={SIP_FREQUENCY_BADGE_COLORS.CUSTOM}>
          Custom (Day {customDay})
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className={SIP_FREQUENCY_BADGE_COLORS[frequency as SIPFrequency] || SIP_FREQUENCY_BADGE_COLORS.MONTHLY}>
        {getFrequencyLabel(frequency as SIPFrequency)}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">SIP Management</h1>
            <p className="text-sm sm:text-base text-blue-100 dark:text-blue-200 mt-2">
              Manage your systematic investment plans
            </p>
          </div>
          <Button
            onClick={() => {
              setDialogMode('create')
              setEditingSipId(undefined)
              setDialogOpen(true)
            }}
            className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New SIP
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 -mt-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-white/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Active SIPs</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {sips.filter((sip) => sip.isActive).length}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {sips.length - sips.filter((sip) => sip.isActive).length} inactive
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-white/60 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100/80 dark:bg-green-900/40 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Commitment</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(monthlyTotal)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active SIPs only</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50/80 via-violet-50/60 to-white/60 dark:from-purple-900/20 dark:via-violet-900/10 dark:to-gray-800/60 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100/80 dark:bg-purple-900/40 rounded-xl backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Yearly Commitment</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(yearlyTotal)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active SIPs only</p>
          </div>
        </div>
      </div>

      {/* SIPs Table */}
      <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your SIPs</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {sips.length === 0
              ? "No SIPs found. Start by adding your first SIP."
              : `Showing ${sips.length} SIP${sips.length > 1 ? "s" : ""}`}
          </p>
          {sips.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 opacity-50" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No SIPs yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Get started by creating your first systematic investment plan.
              </p>
              <Button
                onClick={() => {
                  setDialogMode('create')
                  setEditingSipId(undefined)
                  setDialogOpen(true)
                }}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New SIP
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200/50 dark:border-gray-700/50">
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
                            onClick={() => {
                              setDialogMode('edit')
                              setEditingSipId(sip.id)
                              setDialogOpen(true)
                            }}
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
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
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* SIP Dialog */}
      <SIPDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        sipId={editingSipId}
        onSuccess={() => {
          fetchSIPs()
        }}
      />
    </div>
  )
}