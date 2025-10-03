"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { isSuperAdmin } from "@/lib/authz"
import { Role } from "@/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/icons/logo"
import { Footer } from "@/components/layout/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Wallet,
  TrendingUp,
  PieChart,
  Shield,
  Smartphone,
  Users,
  ArrowRight,
  Check
} from "lucide-react"

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Namma Paisa</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
            <ThemeToggle />
            <Link href="/contact" className="hidden md:block">
              <Button variant="ghost">Contact Us</Button>
            </Link>
            {session ? (
              <Link href={
                isSuperAdmin(session) && !session.user.roles.includes(Role.CUSTOMER)
                  ? "/admin"
                  : "/dashboard"
              }>
                <Button size="sm" className="sm:size-default">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm" className="sm:size-default">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="sm:size-default">
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Take Control of Your Financial Future
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
          Namma Paisa is your all-in-one personal finance management platform.
          Track expenses, manage budgets, and achieve your financial goals with ease.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
          <Link href="/auth/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
              Start Free Today <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <Link href="/auth/signin" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-4">Powerful Features for Smart Finance Management</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 px-4">
            Everything you need to manage your money effectively
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Expense Tracking</CardTitle>
              <CardDescription>
                Track all your expenses in real-time with detailed categorization and insights
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <PieChart className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Budget Planning</CardTitle>
              <CardDescription>
                Create and manage budgets with smart alerts to keep your spending on track
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Wallet className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Multi-Account Support</CardTitle>
              <CardDescription>
                Manage multiple accounts and get a unified view of your entire financial picture
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Bank-level encryption ensures your financial data is always safe and secure
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Smartphone className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Mobile Responsive</CardTitle>
              <CardDescription>
                Access your finances anytime, anywhere with our fully responsive design
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Family Profiles</CardTitle>
              <CardDescription>
                Create multiple profiles for family members and track household finances together
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-100 dark:bg-gray-800/50 py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 md:mb-12 text-center px-4">Why Choose Namma Paisa?</h2>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">100% Free to Start</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get started with all essential features at no cost
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Easy to Use</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Intuitive interface designed for everyone
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Real-time Insights</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get instant visibility into your spending patterns
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Smart Notifications</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Stay informed with budget alerts and reminders
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Data Export</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Export your financial data anytime in multiple formats
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Regular Updates</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Continuous improvements and new features
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <Card className="bg-gradient-to-r from-primary to-blue-600 text-white border-0">
          <CardContent className="py-10 sm:py-12 md:py-16 text-center px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to Take Control of Your Finances?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-white/90">
              Join thousands of users who trust Namma Paisa for their financial management
            </p>
            <Link href="/auth/signup" className="inline-block w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                Create Your Free Account <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  )
}
