import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { Role } from "@/constants"

export default withAuth(
  function middleware(req) {
    // Check if accessing admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!req.nextauth.token?.roles?.includes(Role.SUPER_ADMIN)) {
        return NextResponse.rewrite(new URL("/unauthorized", req.url))
      }
    }

    // All other protected routes require authentication
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to landing page and auth pages without authentication
        if (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/auth")) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}