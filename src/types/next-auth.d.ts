import { Role } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface User {
    roles: Role[]
    isBlocked?: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      roles: Role[]
      isBlocked?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: Role[]
    isBlocked?: boolean
  }
}