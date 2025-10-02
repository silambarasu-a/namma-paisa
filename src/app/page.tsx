import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/authz"
import { Role } from "@/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/icons/logo"
import { Footer } from "@/components/layout/footer"
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

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Logo className="h-8 w-8" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Namma Paisa</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/contact">
              <Button variant="ghost">Contact Us</Button>
            </Link>
            {session ? (
              <Link href={
                isSuperAdmin(session) && !session.user.roles.includes(Role.CUSTOMER)
                  ? "/admin"
                  : "/dashboard"
              }>
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Take Control of Your Financial Future
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Namma Paisa is your all-in-one personal finance management platform.
          Track expenses, manage budgets, and achieve your financial goals with ease.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">
              Start Free Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features for Smart Finance Management</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Everything you need to manage your money effectively
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="bg-gray-100 dark:bg-gray-800/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Why Choose Namma Paisa?</h2>
            <div className="grid md:grid-cols-2 gap-8">
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
      <section className="container mx-auto px-6 py-20">
        <Card className="bg-gradient-to-r from-primary to-blue-600 text-white border-0">
          <CardContent className="py-16 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Take Control of Your Finances?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Join thousands of users who trust Namma Paisa for their financial management
            </p>
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Create Your Free Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  )
}
