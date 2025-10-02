import { Role } from "@/generated/prisma"

// User-related types
export interface UserWithRoles {
  id: string
  email: string
  name?: string | null
  image?: string | null
  roles: Role[]
  isBlocked?: boolean
  emailVerified?: boolean
}

export interface UserProfile extends UserWithRoles {
  phoneNumber?: string | null
  countryCode?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserListItem {
  id: string
  email: string
  name?: string | null
  roles: Role[]
  isBlocked: boolean
  emailVerified: boolean
  createdAt: Date
  recentlyAccessedAt?: Date | null
}
