"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import {
  Edit,
  Trash2,
  Users as UsersIcon,
  Search,
  UserPlus,
  Mail,
  Phone,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
} from "lucide-react"

type MemberCategory = "FAMILY" | "FRIEND" | "RELATIVE" | "OTHER"

interface Member {
  id: string
  name: string
  category: MemberCategory
  phoneNumber: string | null
  email: string | null
  notes: string | null
  currentBalance: number
  createdAt: string
  _count: {
    transactions: number
  }
}

interface MemberSummary {
  totalMembers: number
  totalOwedToYou: number
  totalYouOwe: number
  membersOwingYou: number
  membersYouOwe: number
  netBalance: number
}

const categoryColors: Record<MemberCategory, string> = {
  FAMILY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  FRIEND: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  RELATIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
}

const categoryLabels: Record<MemberCategory, string> = {
  FAMILY: "Family",
  FRIEND: "Friend",
  RELATIVE: "Relative",
  OTHER: "Other",
}

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [summary, setSummary] = useState<MemberSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [category, setCategory] = useState<MemberCategory>("FAMILY")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    memberId: string
    memberName: string
  } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter)
      }

      const response = await fetch(`/api/members?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch members")

      const data = await response.json()
      setMembers(data.members)
      setSummary(data.summary)
    } catch (error) {
      console.error("Error fetching members:", error)
      toast.error("Failed to load members")
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleAddMember = () => {
    setIsEditing(false)
    setCurrentMember(null)
    resetForm()
    setDialogOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setIsEditing(true)
    setCurrentMember(member)
    setName(member.name)
    setCategory(member.category)
    setPhoneNumber(member.phoneNumber || "")
    setEmail(member.email || "")
    setNotes(member.notes || "")
    setDialogOpen(true)
  }

  const resetForm = () => {
    setName("")
    setCategory("FAMILY")
    setPhoneNumber("")
    setEmail("")
    setNotes("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name,
        category,
        phoneNumber: phoneNumber || undefined,
        email: email || undefined,
        notes: notes || undefined,
      }

      const url = isEditing ? `/api/members/${currentMember?.id}` : "/api/members"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to save member")
      }

      toast.success(`Member ${isEditing ? "updated" : "added"} successfully`)
      setDialogOpen(false)
      resetForm()
      fetchMembers()
    } catch (error) {
      console.error("Error saving member:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (member: Member) => {
    setDeleteConfirmation({
      open: true,
      memberId: member.id,
      memberName: member.name,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return

    try {
      setDeletingId(deleteConfirmation.memberId)
      const response = await fetch(`/api/members/${deleteConfirmation.memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete member")
      }

      toast.success("Member deleted successfully")
      setDeleteConfirmation(null)
      fetchMembers()
    } catch (error) {
      console.error("Error deleting member:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete member")
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewDetails = (memberId: string) => {
    router.push(`/members/${memberId}`)
  }

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phoneNumber?.includes(searchQuery)
  )

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <TrendingUp className="w-3 h-3 mr-1" />
          Owes you ₹{balance.toFixed(2)}
        </Badge>
      )
    } else if (balance < 0) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <TrendingDown className="w-3 h-3 mr-1" />
          You owe ₹{Math.abs(balance).toFixed(2)}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        Settled
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track money you gave or borrowed from family & friends
          </p>
        </div>
        <Button onClick={handleAddMember} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Summary Cards - Glassy Design */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Total Members Card */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
            <div className="relative p-4 sm:p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Members</div>
                <div className="h-10 w-10 rounded-full bg-purple-100/80 dark:bg-purple-900/40 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 flex items-center justify-center">
                  <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {summary.totalMembers}
              </div>
            </div>
          </div>

          {/* They Owe You Card */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
            <div className="relative p-4 sm:p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">They Owe You</div>
                <div className="h-10 w-10 rounded-full bg-green-100/80 dark:bg-green-900/40 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{summary.totalOwedToYou.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.membersOwingYou} member(s)
              </p>
            </div>
          </div>

          {/* You Owe Them Card */}
          <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none"></div>
            <div className="relative p-4 sm:p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">You Owe Them</div>
                <div className="h-10 w-10 rounded-full bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                ₹{summary.totalYouOwe.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.membersYouOwe} member(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="FAMILY">Family</SelectItem>
            <SelectItem value="FRIEND">Friends</SelectItem>
            <SelectItem value="RELATIVE">Relatives</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No members found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first member to start tracking"}
            </p>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={handleAddMember} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{member.name}</h3>
                    <Badge className={categoryColors[member.category]}>
                      {categoryLabels[member.category]}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(member.id)}
                      className="h-8 w-8"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditMember(member)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(member)}
                      disabled={deletingId === member.id}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      {deletingId === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                  )}
                  {member.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      {member.phoneNumber}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  {getBalanceBadge(member.currentBalance)}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {member._count.transactions} transaction(s)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Member" : "Add New Member"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update member information"
                : "Add a family member, friend, or relative to track transactions"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={(value) => setCategory(value as MemberCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAMILY">Family</SelectItem>
                    <SelectItem value="FRIEND">Friend</SelectItem>
                    <SelectItem value="RELATIVE">Relative</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{isEditing ? "Update" : "Add"} Member</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation?.open || false}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmation?.memberName}</strong>?
              This will also delete all associated transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
