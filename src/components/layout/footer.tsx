import Link from "next/link"
import { Logo } from "@/components/icons/logo"

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-6 sm:py-8 mt-auto">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Logo className="h-6 w-6" />
            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Namma Paisa
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <Link
              href="/contact"
              className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              Contact Us
            </Link>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
              © {new Date().getFullYear()} Namma Paisa. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
