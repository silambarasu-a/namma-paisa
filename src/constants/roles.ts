import { Role } from "@/generated/prisma"

// Re-export Role enum from Prisma for convenience
export { Role }

// Role display labels
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CUSTOMER: "Customer",
}

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Full system access with administrative privileges",
  CUSTOMER: "Standard user with access to personal financial data",
}

// Role hierarchy (higher number = more privileges)
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  CUSTOMER: 10,
}

// Role filter options for UI
export const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: Role.SUPER_ADMIN, label: ROLE_LABELS[Role.SUPER_ADMIN] },
  { value: Role.CUSTOMER, label: ROLE_LABELS[Role.CUSTOMER] },
] as const

// Helper function to check if a role has higher privileges than another
export function hasHigherPrivilege(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

// Helper function to get role badge color
export function getRoleBadgeColor(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    case Role.CUSTOMER:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}
