import { PrismaAdapter } from "@auth/prisma-adapter"
import { Adapter } from "next-auth/adapters"
import bcrypt from "bcrypt"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"

// Throttle map to track last update time per user
const lastUpdateMap = new Map<string, number>()

// Update recentlyAccessedAt only once per minute per user
async function updateRecentlyAccessedAt(userId: string) {
  const now = Date.now()
  const lastUpdate = lastUpdateMap.get(userId) || 0
  const oneMinute = 60 * 1000

  // Only update if more than 1 minute has passed
  if (now - lastUpdate > oneMinute) {
    lastUpdateMap.set(userId, now)

    await prisma.user.update({
      where: { id: userId },
      data: { recentlyAccessedAt: new Date() },
    })
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        // Check if user is blocked BEFORE checking password
        if (user.isBlocked) {
          throw new Error("BLOCKED_USER")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          roles: user.roles,
          isBlocked: user.isBlocked,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles
        token.isBlocked = user.isBlocked
      }

      // Check if user is blocked on each request
      if (token.sub) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isBlocked: true },
        })

        if (currentUser?.isBlocked) {
          // User is blocked, invalidate token
          return { ...token, isBlocked: true, error: "blocked" }
        }

        token.isBlocked = currentUser?.isBlocked || false
      }

      return token
    },
    async session({ session, token }) {
      // If user is blocked, return null to invalidate session
      if (token.error === "blocked" || token.isBlocked) {
        throw new Error("BLOCKED_USER")
      }

      if (token && session.user) {
        session.user.id = token.sub!
        session.user.roles = token.roles
        session.user.isBlocked = token.isBlocked as boolean

        // Update recentlyAccessedAt (throttled to once per minute)
        if (token.sub) {
          updateRecentlyAccessedAt(token.sub).catch(() => {
            // Silently fail to not block the session
          })
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}