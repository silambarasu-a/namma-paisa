"use client"

import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, User, Mail, Menu } from "lucide-react"
import Link from "next/link"
import { Role, ROLE_LABELS } from "@/constants"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between h-16 px-3 md:px-8">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 hidden sm:block">
            <h2 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Welcome back, {session.user.name?.split(" ")[0] || "User"}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
              {session.user.roles.includes(Role.SUPER_ADMIN) ? ROLE_LABELS[Role.SUPER_ADMIN] : ROLE_LABELS[Role.CUSTOMER]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-4">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full">
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
                  <AvatarImage src={session.user.image || ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Us
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}