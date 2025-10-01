import { Session } from "next-auth"
import { redirect } from "next/navigation"
import { Role } from "@/constants"

export function requireRole(session: Session | null, allowedRoles: Role[]) {
  if (!session || !session.user) {
    redirect("/auth/signin")
  }

  const hasRole = session.user.roles.some(role => allowedRoles.includes(role))
  if (!hasRole) {
    throw new Error("Forbidden: Insufficient permissions")
  }
}

export function requireAuth(session: Session | null) {
  if (!session || !session.user) {
    redirect("/auth/signin")
  }
}

export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.roles?.includes(Role.SUPER_ADMIN) ?? false
}

export function canAccessUserData(session: Session | null, userId: string): boolean {
  if (!session || !session.user) return false

  // Super admin can access all data
  if (session.user.roles.includes(Role.SUPER_ADMIN)) return true

  // Users can only access their own data
  return session.user.id === userId
}