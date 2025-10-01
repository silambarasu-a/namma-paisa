"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Ban, CheckCircle, Shield, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Role, ROLE_LABELS, getRoleBadgeColor } from "@/constants"
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

interface User {
  id: string
  email: string
  name: string | null
  phoneNumber: string | null
  countryCode: string | null
  roles: Role[]
  isBlocked: boolean
  createdAt: string
  updatedAt: string
  recentlyAccessedAt: string | null
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all")
  const [sendingResetLink, setSendingResetLink] = useState<string | null>(null)

  // Filter users by role and search
  const filteredUsers = users
    .filter(user => {
      if (roleFilter === "all") return true
      return user.roles.includes(roleFilter)
    })
    .filter(user => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        user.email.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query)
      )
    })

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [roles, setRoles] = useState<Role[]>([Role.CUSTOMER])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        toast.error("Failed to load users")
      }
    } catch {
      toast.error("An error occurred while loading users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setIsEditing(true)
      setCurrentUser(user)
      setEmail(user.email)
      setName(user.name || "")
      setPhoneNumber(user.phoneNumber || "")
      setCountryCode(user.countryCode || "+91")
      setRoles(user.roles)
      setPassword("")
    } else {
      setIsEditing(false)
      setCurrentUser(null)
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setPhoneNumber("")
    setCountryCode("+91")
    setRoles([Role.CUSTOMER])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isEditing && currentUser) {
        // Update user
        const response = await fetch(`/api/admin/users/${currentUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phoneNumber, countryCode, roles }),
        })

        if (response.ok) {
          toast.success("User updated successfully")
          setIsDialogOpen(false)
          loadUsers()
        } else {
          const data = await response.json()
          toast.error(data.error || "Failed to update user")
        }
      } else {
        // Create user
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, phoneNumber, countryCode, roles }),
        })

        if (response.ok) {
          toast.success("User created successfully")
          setIsDialogOpen(false)
          resetForm()
          loadUsers()
        } else {
          const data = await response.json()
          toast.error(data.error || "Failed to create user")
        }
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const handleToggleBlock = async (userId: string, currentBlockedStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !currentBlockedStatus }),
      })

      if (response.ok) {
        toast.success(currentBlockedStatus ? "User unblocked" : "User blocked")
        loadUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update user")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/admin/users/${userToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("User deleted successfully")
        loadUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete user")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const openDeleteDialog = (userId: string) => {
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const handleSendResetLink = async (userId: string, userEmail: string) => {
    setSendingResetLink(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/send-reset-link`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Password reset link sent to ${userEmail}`)
      } else {
        toast.error(data.error || "Failed to send reset link")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSendingResetLink(null)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900 -mx-6 md:-mx-8 -mt-20 px-6 md:px-8 pt-24 pb-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-white" />
              <h1 className="text-3xl font-bold text-white">User Management</h1>
            </div>
            <p className="text-purple-100 dark:text-purple-200 mt-2">
              Create, edit, and manage user accounts
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-white text-purple-600 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* All Users Section */}
      <Card className="shadow-lg -mt-12">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage all users in the system</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(value: "all" | Role) => setRoleFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={Role.SUPER_ADMIN}>{ROLE_LABELS[Role.SUPER_ADMIN]}s</SelectItem>
                  <SelectItem value={Role.CUSTOMER}>{ROLE_LABELS[Role.CUSTOMER]}s</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Last Accessed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map((role) => (
                              <Badge
                                key={role}
                                className={getRoleBadgeColor(role)}
                              >
                                {ROLE_LABELS[role]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.isBlocked ? (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <Ban className="h-3 w-3" />
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex w-fit items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.recentlyAccessedAt
                            ? new Date(user.recentlyAccessedAt).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendResetLink(user.id, user.email)}
                              title="Send password reset link"
                              disabled={user.isBlocked || sendingResetLink === user.id}
                            >
                              {sendingResetLink === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                              className={user.isBlocked ? "text-green-600" : "text-orange-600"}
                              title={user.isBlocked ? "Unblock user" : "Block user"}
                            >
                              {user.isBlocked ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(user.id)}
                              className="text-red-600"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update user information and role"
                : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditing}
                  required
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="countryCode"
                    type="text"
                    placeholder="+91"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Roles *</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={roles.includes(Role.CUSTOMER)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoles([...roles, Role.CUSTOMER])
                        } else {
                          setRoles(roles.filter(r => r !== Role.CUSTOMER))
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span>{ROLE_LABELS[Role.CUSTOMER]}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={roles.includes(Role.SUPER_ADMIN)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoles([...roles, Role.SUPER_ADMIN])
                        } else {
                          setRoles(roles.filter(r => r !== Role.SUPER_ADMIN))
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span>{ROLE_LABELS[Role.SUPER_ADMIN]}</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will
              permanently remove all user data including expenses, income, and investments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}