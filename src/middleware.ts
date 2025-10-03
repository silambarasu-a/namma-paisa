import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { Role } from "@/constants"

export default withAuth(
  function middleware(req) {
    const roles = req.nextauth.token?.roles as string[] || []

    // Check if accessing admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!roles.includes(Role.SUPER_ADMIN)) {
        return NextResponse.rewrite(new URL("/unauthorized", req.url))
      }
    }

    // Check if super_admin without CUSTOMER role is trying to access customer routes
    const customerRoutes = ["/dashboard", "/profile", "/income", "/tax", "/loans", "/investments", "/expenses", "/credit-cards", "/monthly-snapshot"]
    const isCustomerRoute = customerRoutes.some(route => req.nextUrl.pathname.startsWith(route))

    if (isCustomerRoute && roles.includes(Role.SUPER_ADMIN) && !roles.includes(Role.CUSTOMER)) {
      return NextResponse.redirect(new URL("/admin", req.url))
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