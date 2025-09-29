import { Role } from "@/generated/prisma"
import { Session } from "next-auth"
import { redirect } from "next/navigation"

export function requireRole(session: Session | null, allowedRoles: Role[]) {
  if (!session || !session.user) {
    redirect("/auth/signin")
  }

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("Forbidden: Insufficient permissions")
  }
}

export function requireAuth(session: Session | null) {
  if (!session || !session.user) {
    redirect("/auth/signin")
  }
}

export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.role === "SUPER_ADMIN"
}

export function canAccessUserData(session: Session | null, userId: string): boolean {
  if (!session || !session.user) return false

  // Super admin can access all data
  if (session.user.role === "SUPER_ADMIN") return true

  // Users can only access their own data
  return session.user.id === userId
}