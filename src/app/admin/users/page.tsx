"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Ban, CheckCircle, Shield, Mail } from "lucide-react"
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<{ id: string; email: string } | null>(null)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [userToBlock, setUserToBlock] = useState<{ id: string; isBlocked: boolean } | null>(null)
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

  const handleToggleBlock = async () => {
    if (!userToBlock) return

    try {
      const response = await fetch(`/api/admin/users/${userToBlock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !userToBlock.isBlocked }),
      })

      if (response.ok) {
        toast.success(userToBlock.isBlocked ? "User unblocked" : "User blocked")
        loadUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to update user")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setBlockDialogOpen(false)
      setUserToBlock(null)
    }
  }

  const openBlockDialog = (userId: string, isBlocked: boolean) => {
    setUserToBlock({ id: userId, isBlocked })
    setBlockDialogOpen(true)
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

  const handleSendResetLink = async () => {
    if (!userToReset) return

    setSendingResetLink(userToReset.id)
    try {
      const response = await fetch(`/api/admin/users/${userToReset.id}/send-reset-link`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Password reset link sent to ${userToReset.email}`)
      } else {
        toast.error(data.error || "Failed to send reset link")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSendingResetLink(null)
      setResetDialogOpen(false)
      setUserToReset(null)
    }
  }

  const openResetDialog = (userId: string, userEmail: string) => {
    setUserToReset({ id: userId, email: userEmail })
    setResetDialogOpen(true)
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900 -mx-4 sm:-mx-6 md:-mx-8 -mt-20 px-4 sm:px-6 md:px-8 pt-24 pb-6 sm:pb-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">User Management</h1>
            </div>
            <p className="text-sm sm:text-base text-purple-100 dark:text-purple-200 mt-1 sm:mt-2">
              Create, edit, and manage user accounts
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-white text-purple-600 hover:bg-gray-100 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* All Users Section */}
      <Card className="shadow-lg -mt-12">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">All Users</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage all users in the system</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Select value={roleFilter} onValueChange={(value: "all" | Role) => setRoleFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                className="w-full sm:flex-1 sm:max-w-md"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredUsers.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm break-all">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.name || "-"}</p>
                      </div>
                      {user.isBlocked ? (
                        <Badge variant="destructive" className="flex items-center gap-1 flex-shrink-0">
                          <Ban className="h-3 w-3" />
                          Blocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 text-green-600 flex-shrink-0">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                      <p>Last Access: {user.recentlyAccessedAt ? new Date(user.recentlyAccessedAt).toLocaleString() : "Never"}</p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                        className="w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetDialog(user.id, user.email)}
                        disabled={user.isBlocked}
                        className="w-full"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBlockDialog(user.id, user.isBlocked)}
                          className={`flex-1 ${user.isBlocked ? "text-green-600" : "text-orange-600"}`}
                        >
                          {user.isBlocked ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Block
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(user.id)}
                          className="flex-1 text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
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
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role} className={getRoleBadgeColor(role)}>
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
                              onClick={() => openResetDialog(user.id, user.email)}
                              title="Send password reset link"
                              disabled={user.isBlocked}
                            >
                              <Mail className="h-4 w-4" />
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
                              onClick={() => openBlockDialog(user.id, user.isBlocked)}
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
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

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Password Reset Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send a password reset link to {userToReset?.email}?
              The user will receive an email with instructions to reset their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendResetLink}
              disabled={sendingResetLink !== null}
            >
              {sendingResetLink ? "Sending..." : "Send Reset Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block/Unblock Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToBlock?.isBlocked ? "Unblock User" : "Block User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToBlock?.isBlocked
                ? "Are you sure you want to unblock this user? They will be able to access the system again."
                : "Are you sure you want to block this user? They will not be able to access the system until unblocked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBlock}
              className={userToBlock?.isBlocked ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {userToBlock?.isBlocked ? "Unblock User" : "Block User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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